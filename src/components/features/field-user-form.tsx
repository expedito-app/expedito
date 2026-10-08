"use client";

import { useActionState } from "react";
import { createFieldUser } from "@/actions/team";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { TRANSPORT_LABEL, TRANSPORT_MODES } from "@/lib/transport";
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
        label="Senha temporária"
        name="password"
        hint="Mínimo de 8 caracteres. Será trocada no primeiro acesso."
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        errors={state.fieldErrors?.password}
      />
      <SelectField
        label="Meio de transporte"
        name="transportMode"
        defaultValue="transit"
        hint="Usado para estimar o tempo entre as visitas na rota."
        errors={state.fieldErrors?.transportMode}
      >
        {TRANSPORT_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {TRANSPORT_LABEL[mode]}
          </option>
        ))}
      </SelectField>
      <Button type="submit" disabled={pending} className="mt-2 self-start">
        {pending ? "Criando…" : "Adicionar à equipe"}
      </Button>
    </form>
  );
}
