import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const controlClass =
  "rounded-md border border-line bg-surface px-3 text-base text-ink transition-colors duration-150 ease-soft placeholder:text-muted/70 focus:border-accent focus:outline-none aria-invalid:border-risk-overdue";

type BaseProps = {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
};

function FieldShell({
  label,
  name,
  errors,
  hint,
  children,
}: BaseProps & { children: (describedBy: string | undefined) => ReactNode }) {
  const errorId = errors?.length ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={name}
        className="text-label font-medium uppercase text-muted"
      >
        {label}
      </label>
      {children(describedBy)}
      {hint && !errorId && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {errorId && (
        <p id={errorId} className="text-sm text-risk-overdue">
          {errors?.[0]}
        </p>
      )}
    </div>
  );
}

export function Field({
  label,
  name,
  errors,
  hint,
  ...inputProps
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} name={name} errors={errors} hint={hint}>
      {(describedBy) => (
        <input
          id={name}
          name={name}
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={describedBy}
          className={`h-11 ${controlClass}`}
          {...inputProps}
        />
      )}
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  name,
  errors,
  hint,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} name={name} errors={errors} hint={hint}>
      {(describedBy) => (
        <textarea
          id={name}
          name={name}
          rows={3}
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={describedBy}
          className={`py-2 ${controlClass}`}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  name,
  errors,
  hint,
  children,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} name={name} errors={errors} hint={hint}>
      {(describedBy) => (
        <select
          id={name}
          name={name}
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={describedBy}
          className={`h-11 ${controlClass}`}
          {...props}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}
