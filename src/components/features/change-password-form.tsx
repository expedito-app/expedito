"use client";

import { useActionState } from "react";
import { changePassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import type { FormState } from "@/lib/validation/form-state";

const initialState: FormState = {};

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(
    changePassword,
    initialState,
  );
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <Field
        label="Nova senha"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        hint="Mínimo de 8 caracteres."
        errors={state.fieldErrors?.password}
      />
      <Field
        label="Confirme a nova senha"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.confirmPassword}
      />
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Salvando…" : "Salvar e entrar"}
      </Button>
    </form>
  );
}
