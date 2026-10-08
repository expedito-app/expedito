"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentProfile, type Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  fromZodError,
  readForm,
  uuidSchema,
  type FormState,
} from "@/lib/validation/form-state";
import { TASK_FIELDS, taskSchema, type TaskInput } from "@/lib/validation/task";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const NOT_MANAGER: FormState = {
  error: "Apenas gestores podem gerenciar tarefas.",
};

async function requireManager(): Promise<Profile | null> {
  const profile = await getCurrentProfile();
  return profile?.role === "manager" ? profile : null;
}

// A agência e o responsável precisam ser do gestor logado. O RLS só confere
// manager_id da tarefa (migration de correção não aplicada), então checamos aqui.
async function checkOwnership(
  supabase: Supabase,
  managerId: string,
  input: TaskInput,
): Promise<FormState["fieldErrors"] | null> {
  const { data: agency } = await supabase
    .from("agencies")
    .select("id")
    .eq("id", input.agencyId)
    .eq("manager_id", managerId)
    .maybeSingle();
  if (!agency) return { agencyId: ["Escolha uma das suas agências."] };

  if (input.assignedTo) {
    const { data: member } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", input.assignedTo)
      .eq("role", "field")
      .eq("manager_id", managerId)
      .maybeSingle();
    if (!member) return { assignedTo: ["Escolha alguém da sua equipe."] };
  }
  return null;
}

function toRow(input: TaskInput) {
  return {
    agency_id: input.agencyId,
    document_ref: input.documentRef,
    description: input.description,
    urgency: input.urgency,
    due_at: input.dueAt,
    assigned_to: input.assignedTo,
    status: input.status,
  };
}

const draftShape = z.object({
  agencyId: z.string(),
  documentRef: z.string(),
  description: z.string(),
  urgency: z.string(),
  dueAt: z.string(),
  assignedTo: z.string(),
  status: z.string(),
});

// Validação, checagem de dono e gravação: usada pelo formulário e pelo assistente.
async function insertTask(
  managerId: string,
  values: Record<(typeof TASK_FIELDS)[number], string>,
): Promise<FormState & { id?: string }> {
  const parsed = taskSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);

  const supabase = await createClient();
  const ownership = await checkOwnership(supabase, managerId, parsed.data);
  if (ownership) {
    return { error: "Revise os campos destacados.", fieldErrors: ownership, values };
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...toRow(parsed.data),
      manager_id: managerId,
      completed_at: parsed.data.status === "done" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) return { error: "Não foi possível salvar a tarefa.", values };
  return { id: data.id };
}

export async function createTask(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const manager = await requireManager();
  if (!manager) return NOT_MANAGER;

  const result = await insertTask(manager.id, readForm(formData, TASK_FIELDS));
  if (!result.id) return result;

  redirect("/tarefas");
}

/** Grava o rascunho confirmado pelo gestor no assistente de IA. */
export async function createTaskFromDraft(
  draft: unknown,
): Promise<FormState & { id?: string }> {
  const manager = await requireManager();
  if (!manager) return NOT_MANAGER;

  // Mesmo formato do formulário (texto); o taskSchema valida o conteúdo em seguida.
  const values = draftShape.safeParse(draft);
  if (!values.success) return { error: "Rascunho inválido." };

  const result = await insertTask(manager.id, values.data);
  if (result.id) revalidatePath("/painel");
  return result;
}

export async function updateTask(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const manager = await requireManager();
  if (!manager) return NOT_MANAGER;
  if (!uuidSchema.safeParse(id).success) return { error: "Tarefa inválida." };

  const values = readForm(formData, TASK_FIELDS);
  const parsed = taskSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("tasks")
    .select("status, completed_at")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { error: "Tarefa não encontrada." };

  const ownership = await checkOwnership(supabase, manager.id, parsed.data);
  if (ownership) {
    return { error: "Revise os campos destacados.", fieldErrors: ownership, values };
  }

  // Mantém a data de conclusão original se a tarefa já estava concluída.
  const completedAt =
    parsed.data.status !== "done"
      ? null
      : current.status === "done"
        ? current.completed_at
        : new Date().toISOString();

  const { data, error } = await supabase
    .from("tasks")
    .update({
      ...toRow(parsed.data),
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error || !data.length) {
    return { error: "Não foi possível salvar a tarefa.", values };
  }

  // Reaberta pelo gestor: a assinatura da conclusão antiga deixa de valer
  // (o campo já faz o mesmo ao desfazer). Só apaga se a tarefa não está concluída.
  if (current.status === "done" && parsed.data.status !== "done") {
    const { error: signatureError } = await supabase.rpc("manager_clear_task_signature", {
      p_task_id: id,
    });
    if (signatureError) console.error("Assinatura não removida:", signatureError.message);
  }

  redirect("/tarefas");
}

export async function deleteTask(id: string): Promise<FormState> {
  const manager = await requireManager();
  if (!manager) return NOT_MANAGER;
  if (!uuidSchema.safeParse(id).success) return { error: "Tarefa inválida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data.length) {
    return { error: "Não foi possível excluir a tarefa." };
  }

  redirect("/tarefas");
}
