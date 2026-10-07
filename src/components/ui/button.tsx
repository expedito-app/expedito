import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export const buttonVariants = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent/90 disabled:bg-accent/60",
  ghost:
    "border border-line text-ink hover:bg-surface disabled:text-muted",
  danger:
    "bg-risk-overdue text-white hover:bg-risk-overdue/90 disabled:bg-risk-overdue/60",
};

export const buttonBase =
  "inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-medium transition-colors duration-150 ease-soft disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${buttonBase} ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}
