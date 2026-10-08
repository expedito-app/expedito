"use client";

import { useActionState } from "react";
import { updateTransportMode } from "@/actions/team";
import { TRANSPORT_LABEL, TRANSPORT_MODES, type TransportMode } from "@/lib/transport";
import type { FormState } from "@/lib/validation/form-state";

// Troca o transporte direto na lista da equipe (salva ao escolher).
export function TransportSelect({
  memberId,
  memberName,
  value,
}: {
  memberId: string;
  memberName: string;
  value: TransportMode;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateTransportMode, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="memberId" value={memberId} />
      <label htmlFor={`transport-${memberId}`} className="sr-only">
        Meio de transporte de {memberName}
      </label>
      <select
        id={`transport-${memberId}`}
        name="transportMode"
        defaultValue={value}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-9 rounded-md border border-line bg-surface px-2 text-sm text-ink focus:border-accent focus:outline-none"
      >
        {TRANSPORT_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {TRANSPORT_LABEL[mode]}
          </option>
        ))}
      </select>
      <span aria-live="polite" className={`text-xs ${state.error ? "text-risk-overdue" : "text-muted"}`}>
        {pending ? "Salvando…" : (state.error ?? state.success ?? "")}
      </span>
    </form>
  );
}
