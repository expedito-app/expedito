"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { normalizeKey, parseCsv } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";
import { taskSchema } from "@/lib/validation/task";

export type ImportState = {
  error?: string;
  created?: number;
  problems?: { line: number; message: string }[];
};

const MAX_BYTES = 900_000; // abaixo do limite de 1 MB das Server Actions
const MAX_ROWS = 500;

// Cabeçalhos aceitos (sem acento e minúsculos) → campo da tarefa.
const HEADERS: Record<string, "documentRef" | "agency" | "dueAt" | "urgency" | "member" | "description"> = {
  documento: "documentRef",
  "bl / documento": "documentRef",
  "bl/documento": "documentRef",
  bl: "documentRef",
  agencia: "agency",
  prazo: "dueAt",
  urgencia: "urgency",
  responsavel: "member",
  descricao: "description",
};

const URGENCY: Record<string, "low" | "medium" | "high"> = {
  baixa: "low",
  low: "low",
  media: "medium",
  medium: "medium",
  alta: "high",
  high: "high",
  urgente: "high",
};

const pad = (n: string) => n.padStart(2, "0");

/** "09/10/2026 14:30", "09/10/2026", "2026-10-09 14:30" ou "2026-10-09T14:30" → valor datetime-local. */
function toLocalDateTime(value: string, fallbackTime: string): string | null {
  const v = value.trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T,]+(\d{1,2}):(\d{2}))?$/.exec(v);
  if (m) {
    const time = m[4] ? `${pad(m[4])}:${m[5]}` : fallbackTime;
    return `${m[3]}-${pad(m[2])}-${pad(m[1])}T${time}`;
  }
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(v);
  if (m) {
    const time = m[4] ? `${pad(m[4])}:${m[5]}` : fallbackTime;
    return `${m[1]}-${m[2]}-${m[3]}T${time}`;
  }
  return null;
}

/**
 * Importa tarefas de uma planilha CSV (exportada do Excel ou do Google Sheets).
 * Agência e responsável são casados pelo nome com as listas do próprio gestor
 * (lidas sob RLS), então não há como apontar para dados de outro gestor.
 */
export async function importTasks(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const manager = await getCurrentProfile();
  if (manager?.role !== "manager") return { error: "Apenas gestores podem importar tarefas." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Escolha um arquivo CSV." };
  if (file.size > MAX_BYTES) return { error: "Arquivo muito grande (máximo 900 KB)." };
  if (/\.xlsx?$/i.test(file.name)) {
    return { error: "No Excel, use Arquivo → Salvar como → CSV e envie o .csv." };
  }

  const rows = parseCsv(await file.text());
  if (rows.length < 2) return { error: "A planilha precisa de um cabeçalho e ao menos uma linha." };
  if (rows.length - 1 > MAX_ROWS) return { error: `Máximo de ${MAX_ROWS} linhas por importação.` };

  const columns = rows[0].map((h) => HEADERS[normalizeKey(h)]);
  for (const required of ["documentRef", "agency", "dueAt"] as const) {
    if (!columns.includes(required)) {
      return { error: "Cabeçalho precisa ter as colunas Documento, Agência e Prazo." };
    }
  }

  const supabase = await createClient();
  const [agencies, members] = await Promise.all([
    supabase.from("agencies").select("id, name, closes_at"),
    supabase.from("profiles").select("id, full_name").eq("role", "field"),
  ]);
  const agencyByName = new Map((agencies.data ?? []).map((a) => [normalizeKey(a.name), a]));
  const memberByName = new Map((members.data ?? []).map((m) => [normalizeKey(m.full_name), m.id]));

  const problems: { line: number; message: string }[] = [];
  const inserts: {
    manager_id: string;
    agency_id: string;
    assigned_to: string | null;
    document_ref: string;
    description: string | null;
    urgency: "low" | "medium" | "high";
    due_at: string;
    status: "pending";
  }[] = [];

  rows.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const get = (field: string) => {
      const i = columns.indexOf(field as (typeof columns)[number]);
      return i >= 0 ? (cells[i] ?? "").trim() : "";
    };

    const agency = agencyByName.get(normalizeKey(get("agency")));
    if (!agency) {
      problems.push({ line, message: `Agência “${get("agency")}” não cadastrada.` });
      return;
    }
    const memberName = get("member");
    const memberId = memberName ? memberByName.get(normalizeKey(memberName)) : undefined;
    if (memberName && !memberId) {
      problems.push({ line, message: `“${memberName}” não está na equipe.` });
      return;
    }
    const urgencyText = normalizeKey(get("urgency"));
    const urgency = urgencyText ? URGENCY[urgencyText] : "medium";
    if (!urgency) {
      problems.push({ line, message: "Urgência deve ser Baixa, Média ou Alta." });
      return;
    }
    // Sem horário: usa o fechamento da agência (ou 17:00), como o assistente.
    const fallbackTime = agency.closes_at?.slice(0, 5) ?? "17:00";
    const dueAt = toLocalDateTime(get("dueAt"), fallbackTime);

    const parsed = taskSchema.safeParse({
      agencyId: agency.id,
      documentRef: get("documentRef"),
      description: get("description"),
      urgency,
      dueAt: dueAt ?? "",
      assignedTo: memberId ?? "",
      status: "pending",
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      problems.push({ line, message: issue?.message ?? "Linha inválida." });
      return;
    }
    inserts.push({
      manager_id: manager.id,
      agency_id: parsed.data.agencyId,
      assigned_to: parsed.data.assignedTo,
      document_ref: parsed.data.documentRef,
      description: parsed.data.description,
      urgency: parsed.data.urgency,
      due_at: parsed.data.dueAt,
      status: "pending",
    });
  });

  if (problems.length) {
    // Tudo ou nada: o gestor corrige a planilha e importa de novo.
    return { error: "Nada foi importado. Corrija as linhas abaixo e envie de novo.", problems: problems.slice(0, 50) };
  }

  const { error } = await supabase.from("tasks").insert(inserts);
  if (error) return { error: "Não foi possível gravar as tarefas." };

  revalidatePath("/tarefas");
  revalidatePath("/painel");
  return { created: inserts.length };
}
