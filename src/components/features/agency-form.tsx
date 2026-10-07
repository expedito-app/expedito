"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonBase, buttonVariants } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import type { FormState } from "@/lib/validation/form-state";

export type AgencyFormValues = {
  name: string;
  address: string;
  opensAt: string;
  closesAt: string;
  requirements: string;
  notes: string;
};

export const EMPTY_AGENCY: AgencyFormValues = {
  name: "",
  address: "",
  opensAt: "",
  closesAt: "",
  requirements: "",
  notes: "",
};

type AgencyFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: AgencyFormValues;
  submitLabel: string;
};

export function AgencyForm({ action, initial, submitLabel }: AgencyFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = { ...initial, ...state.values };
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-6" noValidate>
      <FormMessage state={state} />
      <Field
        label="Nome"
        name="name"
        required
        defaultValue={v.name}
        errors={errors?.name}
      />
      <Field
        label="Endereço"
        name="address"
        defaultValue={v.address}
        errors={errors?.address}
      />
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Abre às"
          name="opensAt"
          type="time"
          defaultValue={v.opensAt}
          errors={errors?.opensAt}
        />
        <Field
          label="Fecha às"
          name="closesAt"
          type="time"
          defaultValue={v.closesAt}
          errors={errors?.closesAt}
          hint="Usado no cálculo de risco."
        />
      </div>
      <TextAreaField
        label="Exigências"
        name="requirements"
        defaultValue={v.requirements}
        errors={errors?.requirements}
        hint="Documentos, procuração, senha de atendimento…"
      />
      <TextAreaField
        label="Observações"
        name="notes"
        defaultValue={v.notes}
        errors={errors?.notes}
      />
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
        <Link href="/agencias" className={`${buttonBase} ${buttonVariants.ghost}`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
