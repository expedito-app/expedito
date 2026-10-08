"use server";

import { refresh } from "next/cache";
import { getCurrentProfile, type Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  completionSchema,
  occurrenceSchema,
  statusChangeSchema,
} from "@/lib/validation/field";
import {
  fromZodError,
  readForm,
  uuidSchema,
  type FormState,
} from "@/lib/validation/form-state";
import type { Enums } from "@/types/database";

const NOT_FIELD: FormState = {
  error: "Apenas a equipe de campo atualiza tarefas por aqui.",
};

async function requireField(): Promise<Profile | null> {
  const profile = await getCurrentProfile();
  return profile?.role === "field" && profile.manager_id ? profile : null;
}

// O campo não tem UPDATE em tasks: o status só muda pela função do banco,
// que confere se a tarefa está atribuída a quem chama (CLAUDE.md, seção 4.4).
export async function updateTaskStatus(
  taskId: string,
  status: Enums<"task_status">,
): Promise<FormState> {
  if (!(await requireField())) return NOT_FIELD;

  const parsed = statusChangeSchema.safeParse({ taskId, status });
  if (!parsed.success) return { error: "Mudança de status inválida." };
  if (parsed.data.status === "done") {
    return { error: "Para concluir, colete a assinatura." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("field_update_task_status", {
    p_task_id: parsed.data.taskId,
    p_status: parsed.data.status,
  });
  if (error) return { error: "Não foi possível atualizar a tarefa." };

  refresh();
  return {};
}

// Conclui com assinatura: a função do banco grava as duas coisas juntas.
export async function completeTaskWithSignature(input: unknown): Promise<FormState> {
  if (!(await requireField())) return NOT_FIELD;

  const parsed = completionSchema.safeParse(input);
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      error: fieldErrors.image?.[0] ?? "Revise os campos destacados.",
      fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("field_complete_task_with_signature", {
    p_task_id: parsed.data.taskId,
    p_signer_name: parsed.data.signerName,
    p_image: parsed.data.image,
  });
  if (error) return { error: "Não foi possível concluir a tarefa." };

  refresh();
  return { success: "Tarefa concluída." };
}

// Registra a ocorrência e coloca a tarefa em "Com problema".
export async function reportOccurrence(
  taskId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const profile = await requireField();
  if (!profile?.manager_id) return NOT_FIELD;
  if (!uuidSchema.safeParse(taskId).success) return { error: "Tarefa inválida." };

  const values = readForm(formData, ["type", "note"] as const);
  const parsed = occurrenceSchema.safeParse(values);
  if (!parsed.success) return fromZodError(parsed.error, values);

  // manager_id e author_id vêm do perfil no banco, nunca do formulário.
  // O RLS ainda exige que a tarefa esteja atribuída a quem registra.
  const supabase = await createClient();
  const { error } = await supabase.from("task_occurrences").insert({
    task_id: taskId,
    manager_id: profile.manager_id,
    author_id: profile.id,
    type: parsed.data.type,
    note: parsed.data.note,
  });
  if (error) {
    return { error: "Não foi possível registrar a ocorrência.", values };
  }

  const { error: statusError } = await supabase.rpc("field_update_task_status", {
    p_task_id: taskId,
    p_status: "problem",
  });

  refresh();
  return statusError
    ? { error: "Ocorrência registrada, mas o status não foi alterado." }
    : { success: "Ocorrência registrada." };
}
