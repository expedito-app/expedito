"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonBase, buttonVariants } from "@/components/ui/button";
import { Field, SelectField, TextAreaField } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { STATUS_LABEL, URGENCY_LABEL } from "@/lib/format";
import type { FormState } from "@/lib/validation/form-state";
import { TASK_STATUSES, TASK_URGENCIES } from "@/lib/validation/task";

export type TaskFormValues = {
  agencyId: string;
  documentRef: string;
  description: string;
  urgency: string;
  dueAt: string;
  assignedTo: string;
  status: string;
};

export const EMPTY_TASK: TaskFormValues = {
  agencyId: "",
  documentRef: "",
  description: "",
  urgency: "medium",
  dueAt: "",
  assignedTo: "",
  status: "pending",
};

type Option = { id: string; name: string };

type TaskFormProps = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: TaskFormValues;
  agencies: Option[];
  members: Option[];
  submitLabel: string;
};

export function TaskForm({
  action,
  initial,
  agencies,
  members,
  submitLabel,
}: TaskFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = { ...initial, ...state.values };
  const errors = state.fieldErrors;

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-6" noValidate>
      <FormMessage state={state} />
      <Field
        label="BL / documento"
        name="documentRef"
        required
        defaultValue={v.documentRef}
        errors={errors?.documentRef}
        hint="Ex.: MAEU123456789"
      />
      <SelectField
        label="Agência"
        name="agencyId"
        required
        defaultValue={v.agencyId}
        errors={errors?.agencyId}
      >
        <option value="" disabled>
          Escolha a agência
        </option>
        {agencies.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </SelectField>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Prazo"
          name="dueAt"
          type="datetime-local"
          required
          defaultValue={v.dueAt}
          errors={errors?.dueAt}
          hint="Horário de Brasília."
        />
        <SelectField
          label="Urgência"
          name="urgency"
          defaultValue={v.urgency}
          errors={errors?.urgency}
        >
          {TASK_URGENCIES.map((u) => (
            <option key={u} value={u}>
              {URGENCY_LABEL[u]}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Responsável"
          name="assignedTo"
          defaultValue={v.assignedTo}
          errors={errors?.assignedTo}
        >
          <option value="">Sem responsável</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Status"
          name="status"
          defaultValue={v.status}
          errors={errors?.status}
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </SelectField>
      </div>
      <TextAreaField
        label="Descrição"
        name="description"
        defaultValue={v.description}
        errors={errors?.description}
        hint="O que retirar ou entregar, contato na agência…"
      />
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
        <Link href="/tarefas" className={`${buttonBase} ${buttonVariants.ghost}`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
