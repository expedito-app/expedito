"use server";

import {
  FunctionCallingConfigMode,
  Type,
  type Content,
  type FunctionDeclaration,
} from "@google/genai";
import { GEMINI_MODEL, getGemini } from "@/lib/ai/gemini";
import { getCurrentProfile } from "@/lib/auth";
import {
  URGENCY_LABEL,
  formatClock,
  formatDateTime,
  formatLongDate,
  formatOpeningHours,
  fromDateTimeLocal,
  toDateTimeLocal,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  assistantHistorySchema,
  draftArgsSchema,
} from "@/lib/validation/assistant";
import type { TASK_FIELDS } from "@/lib/validation/task";

export type TaskDraft = Record<(typeof TASK_FIELDS)[number], string>;

export type AssistantReply =
  | { kind: "text"; text: string }
  | { kind: "error"; text: string }
  | {
      kind: "draft";
      text: string;
      draft: TaskDraft;
      // Rótulos já prontos para o cartão de confirmação (datas formatadas no servidor).
      summary: {
        documentRef: string;
        agency: string;
        due: string;
        urgency: string;
        member: string;
        description: string;
      };
    };

const createTaskTool: FunctionDeclaration = {
  name: "criar_tarefa",
  description:
    "Propõe uma tarefa externa (retirada ou entrega de documento em agência). " +
    "O gestor confirma antes de gravar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      agency_id: { type: Type.STRING, description: "id de uma agência da lista" },
      document_ref: {
        type: Type.STRING,
        description: "BL ou identificador do documento, ex.: MSCU1234567",
      },
      due_at: {
        type: Type.STRING,
        description: "Prazo no horário de Brasília, formato AAAA-MM-DDTHH:MM",
      },
      urgency: { type: Type.STRING, enum: ["low", "medium", "high"] },
      assigned_to: {
        type: Type.STRING,
        description: "id de alguém da equipe; omitir se não foi dito",
      },
      description: {
        type: Type.STRING,
        description: "O que retirar ou entregar, em uma frase curta",
      },
    },
    required: ["agency_id", "document_ref", "due_at", "urgency"],
  },
};

// 429 (limite) e 503 (alta demanda) costumam passar em segundos.
function isTransient(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("status" in error)) return false;
  return error.status === 429 || error.status === 503;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (const delayMs of [800, 2000]) {
    try {
      return await fn();
    } catch (error) {
      if (!isTransient(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return fn();
}

async function loadContext() {
  const supabase = await createClient();
  const [agencies, members] = await Promise.all([
    supabase.from("agencies").select("id, name, opens_at, closes_at").order("name"),
    supabase.from("profiles").select("id, full_name").eq("role", "field").order("full_name"),
  ]);
  return { agencies: agencies.data ?? [], members: members.data ?? [] };
}

function systemPrompt(
  now: Date,
  agencies: Awaited<ReturnType<typeof loadContext>>["agencies"],
  members: Awaited<ReturnType<typeof loadContext>>["members"],
): string {
  const agencyLines = agencies
    .map((a) => {
      const hours = formatOpeningHours(a.opens_at, a.closes_at);
      return `- id=${a.id} | ${a.name}${hours ? ` | atende ${hours}` : ""}`;
    })
    .join("\n");
  const memberLines = members.map((m) => `- id=${m.id} | ${m.full_name}`).join("\n");

  return `Você é o assistente do Expedito, que ajuda um gestor de expedição portuária a cadastrar tarefas externas (retirar ou entregar documentos, como BL, em agências de armadores).

Agora: ${formatLongDate(now)}, ${formatClock(now.toISOString())} (horário de Brasília). Data de hoje: ${toDateTimeLocal(now.toISOString()).slice(0, 10)}.

Agências do gestor:
${agencyLines || "(nenhuma cadastrada)"}

Equipe de campo:
${memberLines || "(ninguém cadastrado)"}

Regras:
- Quando houver agência, documento e prazo, chame criar_tarefa. Use somente ids das listas acima; associe nomes aproximados (ex.: "Maersk" → agência com Maersk no nome).
- Se faltar agência, documento ou prazo, ou se o nome for ambíguo, pergunte em uma frase curta, sem chamar a ferramenta.
- Prazo: converta expressões como "amanhã até 15h" para AAAA-MM-DDTHH:MM. Sem horário, use o fechamento da agência; sem fechamento, 17:00.
- Urgência: "urgente"/"prioridade" → high; "sem pressa" → low; caso contrário, medium.
- Responsável só se o gestor disser um nome da equipe.
- Responda sempre em português do Brasil, de forma breve. Você não grava nada: o gestor confirma no cartão.
- Para assuntos fora de cadastro de tarefas, diga que só ajuda a criar tarefas.`;
}

export async function askAssistant(history: unknown): Promise<AssistantReply> {
  const profile = await getCurrentProfile();
  if (profile?.role !== "manager") {
    return { kind: "error", text: "Apenas gestores podem usar o assistente." };
  }

  const parsed = assistantHistorySchema.safeParse(history);
  if (!parsed.success) {
    return { kind: "error", text: parsed.error.issues[0]?.message ?? "Mensagem inválida." };
  }

  const ai = getGemini();
  if (!ai) {
    return {
      kind: "error",
      text: "Assistente indisponível: a chave GEMINI_API_KEY não está configurada.",
    };
  }

  const { agencies, members } = await loadContext();
  if (!agencies.length) {
    return { kind: "text", text: "Cadastre uma agência antes de criar tarefas." };
  }

  const contents: Content[] = parsed.data.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const request = () =>
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: systemPrompt(new Date(), agencies, members),
        tools: [{ functionDeclarations: [createTaskTool] }],
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
        },
        temperature: 0.2,
      },
    });

  let response;
  try {
    response = await withRetry(request);
  } catch (error) {
    console.error("Gemini:", error);
    return {
      kind: "error",
      text: isTransient(error)
        ? "A IA está sobrecarregada no momento. Tente de novo em alguns segundos."
        : "Não consegui falar com a IA agora. Tente de novo.",
    };
  }

  const call = response.functionCalls?.find((c) => c.name === "criar_tarefa");
  if (!call) {
    return {
      kind: "text",
      text: response.text?.trim() || "Não entendi. Pode reformular?",
    };
  }

  const args = draftArgsSchema.safeParse(call.args);
  const agency = args.success
    ? agencies.find((a) => a.id === args.data.agency_id)
    : undefined;
  if (!args.success || !agency) {
    return {
      kind: "text",
      text: "Não consegui montar a tarefa. Diga a agência, o documento e o prazo.",
    };
  }

  // Responsável fora da equipe é descartado (o gestor escolhe depois, se quiser).
  const member = members.find((m) => m.id === args.data.assigned_to);
  const draft: TaskDraft = {
    agencyId: agency.id,
    documentRef: args.data.document_ref,
    description: args.data.description?.trim() ?? "",
    urgency: args.data.urgency,
    dueAt: args.data.due_at,
    assignedTo: member?.id ?? "",
    status: "pending",
  };

  return {
    kind: "draft",
    text: response.text?.trim() || "Confira a tarefa antes de criar:",
    draft,
    summary: {
      documentRef: draft.documentRef,
      agency: agency.name,
      due: formatDateTime(fromDateTimeLocal(draft.dueAt)),
      urgency: URGENCY_LABEL[args.data.urgency],
      member: member?.full_name ?? "Sem responsável",
      description: draft.description,
    },
  };
}
