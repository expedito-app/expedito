"use client";

import { useActionState, useEffect, useState } from "react";
import { reportOccurrence } from "@/actions/field";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/field";
import { OCCURRENCE_LABEL } from "@/lib/format";
import { OCCURRENCE_TYPES } from "@/lib/validation/field";
import type { FormState } from "@/lib/validation/form-state";

type OccurrenceFormProps = {
  taskId: string;
  onDone: (message: string) => void;
  onCancel: () => void;
};

export function OccurrenceForm({ taskId, onDone, onCancel }: OccurrenceFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    reportOccurrence.bind(null, taskId),
    {},
  );
  const [type, setType] = useState(state.values?.type ?? "");

  useEffect(() => {
    if (state.success) onDone(state.success);
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.error && !state.fieldErrors && (
        <p role="alert" className="text-sm text-risk-overdue">
          {state.error}
        </p>
      )}
      <fieldset>
        <legend className="text-label font-medium uppercase text-muted">
          O que aconteceu?
        </legend>
        <div className="mt-2 flex flex-col gap-2">
          {OCCURRENCE_TYPES.map((t) => (
            <label
              key={t}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-4 text-base transition-colors duration-150 ${
                type === t ? "border-accent bg-surface font-medium" : "border-line"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={t}
                // Não controlado: após o envio o React reinicia o formulário,
                // e defaultChecked (do valor devolvido) restaura a escolha.
                defaultChecked={state.values?.type === t}
                onChange={() => setType(t)}
                className="size-4 accent-accent"
              />
              {OCCURRENCE_LABEL[t]}
            </label>
          ))}
        </div>
        {state.fieldErrors?.type && (
          <p className="mt-2 text-sm text-risk-overdue">{state.fieldErrors.type[0]}</p>
        )}
      </fieldset>
      <TextAreaField
        label={type === "other" ? "Observação (obrigatória)" : "Observação (opcional)"}
        name="note"
        rows={2}
        defaultValue={state.values?.note}
        errors={state.fieldErrors?.note}
      />
      <p className="text-sm text-muted">
        A tarefa passa para “Com problema” e o gestor é avisado no painel.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="ghost" onClick={onCancel} className="h-12">
          Cancelar
        </Button>
        <Button type="submit" disabled={pending || !type} className="h-12">
          {pending ? "Registrando…" : "Registrar"}
        </Button>
      </div>
    </form>
  );
}
