import type { InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  errors?: string[];
};

export function Field({ label, name, errors, ...inputProps }: FieldProps) {
  const errorId = errors?.length ? `${name}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={name}
        className="text-label font-medium uppercase text-muted"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={errorId}
        className="h-11 rounded-md border border-line bg-surface px-3 text-base text-ink transition-colors duration-150 ease-soft placeholder:text-muted/70 focus:border-accent focus:outline-none aria-invalid:border-risk-overdue"
        {...inputProps}
      />
      {errorId && (
        <p id={errorId} className="text-sm text-risk-overdue">
          {errors?.[0]}
        </p>
      )}
    </div>
  );
}
