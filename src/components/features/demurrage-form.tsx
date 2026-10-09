"use client";

import { useActionState } from "react";
import { saveDemurrageSettings } from "@/actions/company";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import type { FormState } from "@/lib/validation/form-state";

export type DemurrageFormValues = {
  dailyBrl: string;
  containersPerBl: string;
  daysPerDelay: string;
  baselinePercent: string;
};

export function DemurrageForm({ initial }: { initial: DemurrageFormValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveDemurrageSettings, {});
  const v = { ...initial, ...state.values };
  const errors = state.fieldErrors;
  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Diária de demurrage (R$ por contêiner)"
          name="dailyBrl"
          inputMode="decimal"
          defaultValue={v.dailyBrl}
          errors={errors?.dailyBrl}
          hint="Mercado: ~US$ 75 (dry 20') a ~US$ 460 (reefer) por dia."
        />
        <Field
          label="Contêineres por BL (média)"
          name="containersPerBl"
          inputMode="decimal"
          defaultValue={v.containersPerBl}
          errors={errors?.containersPerBl}
        />
        <Field
          label="Dias de demurrage por atraso"
          name="daysPerDelay"
          inputMode="decimal"
          defaultValue={v.daysPerDelay}
          errors={errors?.daysPerDelay}
          hint="Conservador: 1 dia por atraso."
        />
        <Field
          label="Taxa de atraso antes do Expedito (%)"
          name="baselinePercent"
          inputMode="decimal"
          defaultValue={v.baselinePercent}
          errors={errors?.baselinePercent}
          hint="Como era na planilha/WhatsApp (ex.: 25)."
        />
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando…" : "Salvar premissas"}
      </Button>
    </form>
  );
}
