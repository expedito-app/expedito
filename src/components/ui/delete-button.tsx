"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/validation/form-state";
import { Button } from "./button";

type DeleteButtonProps = {
  action: (prev: FormState) => Promise<FormState>;
  label: string;
  confirmLabel: string;
};

// Exclusão em dois cliques: o primeiro pede confirmação.
export function DeleteButton({ action, label, confirmLabel }: DeleteButtonProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-col items-start gap-3">
      {state.error && (
        <p role="alert" className="text-sm text-risk-overdue">
          {state.error}
        </p>
      )}
      {confirming ? (
        <form action={formAction} className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="danger"
            disabled={pending}
            autoFocus
          >
            {pending ? "Excluindo…" : confirmLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirming(false)}
          >
            Cancelar
          </Button>
        </form>
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setConfirming(true)}
        >
          {label}
        </Button>
      )}
    </div>
  );
}
