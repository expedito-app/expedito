"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HOME_BY_ROLE, getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CHANGE_PASSWORD_PATH,
  MUST_CHANGE_PASSWORD_KEY,
  mustChangePassword,
} from "@/lib/password-change";
import { changePasswordSchema, signInSchema } from "@/lib/validation/auth";
import { fromZodError, type FormState } from "@/lib/validation/form-state";

export async function signIn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "E-mail ou senha incorretos." };
  if (mustChangePassword(data.user.app_metadata)) {
    redirect(CHANGE_PASSWORD_PATH);
  }

  const profile = await getCurrentProfile();
  redirect(profile ? HOME_BY_ROLE[profile.role] : "/login");
}

// Troca da senha temporária no primeiro acesso. A senha muda com a sessão do
// próprio usuário; a marca em app_metadata só sai pelo cliente admin, e o
// refreshSession() emite um token novo já sem ela (o proxy lê o token).
export async function changePassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect("/login");

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "A nova senha precisa ser diferente da senha temporária."
          : error.code === "weak_password"
            ? "Senha fraca. Escolha uma senha mais forte."
            : "Não foi possível trocar a senha. Tente novamente.",
    };
  }

  const { error: flagError } = await createAdminClient().auth.admin.updateUserById(
    userId,
    { app_metadata: { [MUST_CHANGE_PASSWORD_KEY]: false } },
  );
  if (flagError) {
    return { error: "Senha trocada, mas não foi possível liberar o acesso." };
  }
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    // O token antigo ainda traz a marca; entrar de novo emite um token limpo.
    await supabase.auth.signOut();
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  redirect(profile ? HOME_BY_ROLE[profile.role] : "/login");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
