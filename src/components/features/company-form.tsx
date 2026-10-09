"use client";

import { useActionState } from "react";
import { saveCompany } from "@/actions/company";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import type { FormState } from "@/lib/validation/form-state";

export type CompanyFormValues = {
  companyName: string;
  baseAddress: string;
  baseLatitude: string;
  baseLongitude: string;
};

export function CompanyForm({
  initial,
  submitLabel,
}: {
  initial: CompanyFormValues;
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCompany, {});
  const v = { ...initial, ...state.values };
  const errors = state.fieldErrors;
  return (
    <form action={action} className="flex max-w-xl flex-col gap-6" noValidate>
      <FormMessage state={state} />
      <Field
        label="Nome da empresa"
        name="companyName"
        required
        defaultValue={v.companyName}
        errors={errors?.companyName}
      />
      <Field
        label="Endereço da empresa"
        name="baseAddress"
        required
        defaultValue={v.baseAddress}
        errors={errors?.baseAddress}
        hint="Rua, número, bairro e cidade. É de onde a equipe sai para as visitas."
      />
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Latitude"
          name="baseLatitude"
          inputMode="decimal"
          defaultValue={v.baseLatitude}
          errors={errors?.baseLatitude}
          hint="Opcional: em branco, localizamos pelo endereço."
        />
        <Field
          label="Longitude"
          name="baseLongitude"
          inputMode="decimal"
          defaultValue={v.baseLongitude}
          errors={errors?.baseLongitude}
        />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Localizando…" : submitLabel}
      </Button>
    </form>
  );
}
