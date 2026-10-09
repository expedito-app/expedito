import type { FormState } from "@/lib/validation/form-state";

export function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-2xl bg-risk-overdue-soft px-4 py-3 text-sm text-risk-overdue"
      >
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-2xl bg-risk-ok-soft px-4 py-3 text-sm text-risk-ok"
      >
        {state.success}
      </p>
    );
  }
  return null;
}
