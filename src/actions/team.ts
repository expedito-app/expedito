"use server";

import { refresh } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { MUST_CHANGE_PASSWORD_KEY, ROLE_KEY } from "@/lib/password-change";
import { fieldUserSchema, transportUpdateSchema } from "@/lib/validation/auth";
import { fromZodError, type FormState } from "@/lib/validation/form-state";

// Cria um usuário de campo vinculado ao gestor logado (CLAUDE.md, seção 4.3).
export async function createFieldUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const manager = await getCurrentProfile();
  if (!manager || manager.role !== "manager") {
    return { error: "Apenas gestores podem criar usuários de campo." };
  }

  const parsed = fieldUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    transportMode: formData.get("transportMode"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const admin = createAdminClient();
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.fullName },
      // Senha temporária: troca obrigatória no primeiro acesso.
      // Papel no token: o proxy dispensa a consulta ao perfil a cada página.
      app_metadata: { [MUST_CHANGE_PASSWORD_KEY]: true, [ROLE_KEY]: "field" },
    });
  if (createError || !created.user) {
    return {
      error:
        createError?.code === "email_exists"
          ? "Já existe um usuário com este e-mail."
          : "Não foi possível criar o usuário.",
    };
  }

  // O trigger criou o perfil como gestor; converte para campo deste gestor.
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      role: "field",
      manager_id: manager.id,
      full_name: parsed.data.fullName,
      transport_mode: parsed.data.transportMode,
    })
    .eq("id", created.user.id);

  if (profileError) {
    // Desfaz o usuário recém-criado para não deixar um "gestor" órfão.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Não foi possível vincular o usuário à sua equipe." };
  }

  refresh();
  return {
    success: `${parsed.data.fullName} foi adicionado à equipe. Passe a senha temporária; ela será trocada no primeiro acesso.`,
  };
}

/** Troca o meio de transporte de alguém da equipe do gestor logado. */
export async function updateTransportMode(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const manager = await getCurrentProfile();
  if (!manager || manager.role !== "manager") {
    return { error: "Apenas gestores podem alterar a equipe." };
  }
  const parsed = transportUpdateSchema.safeParse({
    memberId: formData.get("memberId"),
    transportMode: formData.get("transportMode"),
  });
  if (!parsed.success) return { error: "Escolha um meio de transporte válido." };

  // profiles não tem política de UPDATE: o admin altera, preso ao gestor logado.
  const { data, error } = await createAdminClient()
    .from("profiles")
    .update({ transport_mode: parsed.data.transportMode })
    .eq("id", parsed.data.memberId)
    .eq("role", "field")
    .eq("manager_id", manager.id)
    .select("id");
  if (error || !data.length) return { error: "Não foi possível salvar." };

  refresh();
  return { success: "Salvo." };
}
