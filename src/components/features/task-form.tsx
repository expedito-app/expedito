"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { suggestAssigneeFor, type SuggestionReply } from "@/actions/routing";
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
  /** Na criação: pré-seleciona o responsável sugerido pela roteirização. */
  autoAssign?: boolean;
};

type Suggestion = Extract<SuggestionReply, { ok: true }>;

const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function TaskForm({
  action,
  initial,
  agencies,
  members,
  submitLabel,
  autoAssign = false,
}: TaskFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = { ...initial, ...state.values };
  const errors = state.fieldErrors;

  // Responsável sugerido: recalculado quando agência ou prazo mudam. Só é
  // aplicado sozinho enquanto o gestor não escolheu alguém à mão.
  const [agencyId, setAgencyId] = useState(v.agencyId);
  const [dueAt, setDueAt] = useState(v.dueAt);
  const [assignedTo, setAssignedTo] = useState(v.assignedTo);
  const [touched, setTouched] = useState(Boolean(v.assignedTo));
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  useEffect(() => {
    if (!members.length || !agencyId || !DATETIME.test(dueAt)) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const reply = await suggestAssigneeFor({ agencyId, dueAt });
      if (cancelled) return;
      setSuggestion(reply.ok ? reply : null);
      if (reply.ok && autoAssign && !touched) setAssignedTo(reply.memberId);
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [agencyId, dueAt, autoAssign, touched, members.length]);

  return (
    <form action={formAction} className="card flex max-w-2xl flex-col gap-6" noValidate>
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
        value={agencyId}
        onChange={(e) => setAgencyId(e.target.value)}
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
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
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
          value={assignedTo}
          onChange={(e) => {
            setAssignedTo(e.target.value);
            setTouched(true);
          }}
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
      {suggestion && (
        <div
          aria-live="polite"
          className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-line bg-surface px-3 py-2 text-sm"
        >
          <span className="text-label font-medium uppercase text-accent">Roteirização</span>
          <span>
            <strong className="font-medium">{suggestion.memberName}</strong>
            <span className="text-muted"> · {suggestion.reason}</span>
          </span>
          {assignedTo === suggestion.memberId ? (
            <span className="text-muted">(selecionado)</span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAssignedTo(suggestion.memberId);
                setTouched(true);
              }}
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              Usar sugestão
            </button>
          )}
        </div>
      )}
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
