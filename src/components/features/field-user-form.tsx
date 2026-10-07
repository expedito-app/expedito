"use client";

import { useActionState } from "react";
import { createFieldUser } from "@/actions/team";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import type { FormState } from "@/lib/validation/form-state";

const initialState: FormState = {};

export function FieldUserForm() {
  const [state, action, pending] = useActionState(
    createFieldUser,
    initialState,
  );
  return (
    // key reinicia os campos após cada criação bem-sucedida
    <form
      key={state.success}
      action={action}
      className="flex flex-col gap-5"
      noValidate
    >
      <FormMessage state={state} />
      <Field
        label="Nome completo"
        name="fullName"
        autoComplete="off"
        required
        errors={state.fieldErrors?.fullName}
      />
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="off"
        required
        errors={state.fieldErrors?.email}
      />
      <Field
        label="Senha inicial"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        errors={state.fieldErrors?.password}
      />
      <Button type="submit" disabled={pending} className="mt-2 self-start">
        {pending ? "Criando…" : "Adicionar à equipe"}
      </Button>
    </form>
  );
}
