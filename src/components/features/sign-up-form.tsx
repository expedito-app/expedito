"use client";

import { useActionState } from "react";
import { signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import type { FormState } from "@/lib/validation/form-state";

const initialState: FormState = {};

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, initialState);
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <Field
        label="Nome completo"
        name="fullName"
        autoComplete="name"
        required
        errors={state.fieldErrors?.fullName}
      />
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
        errors={state.fieldErrors?.email}
      />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        errors={state.fieldErrors?.password}
      />
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Criando conta…" : "Criar conta de gestor"}
      </Button>
    </form>
  );
}
