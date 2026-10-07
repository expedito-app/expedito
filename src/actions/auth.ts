"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HOME_BY_ROLE, getCurrentProfile } from "@/lib/auth";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";
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
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "E-mail ou senha incorretos." };

  const profile = await getCurrentProfile();
  redirect(profile ? HOME_BY_ROLE[profile.role] : "/login");
}

// Cadastro público cria sempre um gestor (trigger handle_new_user).
export async function signUp(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });
  if (error) {
    return {
      error:
        error.code === "user_already_exists"
          ? "Já existe uma conta com este e-mail."
          : "Não foi possível criar a conta. Tente novamente.",
    };
  }
  if (!data.session) {
    return { success: "Conta criada. Confirme o e-mail para entrar." };
  }

  redirect(HOME_BY_ROLE.manager);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
