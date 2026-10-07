import type { FormState } from "@/lib/validation/form-state";

export function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-md bg-risk-overdue-soft px-3 py-2 text-sm text-risk-overdue"
      >
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-md bg-risk-ok-soft px-3 py-2 text-sm text-risk-ok"
      >
        {state.success}
      </p>
    );
  }
  return null;
}
