import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export const buttonVariants = {
  primary:
    "bg-ink text-white hover:bg-ink/85 disabled:bg-ink/40",
  ghost:
    "border border-line bg-surface text-ink hover:bg-canvas disabled:text-muted",
  danger:
    "bg-risk-overdue text-white hover:bg-risk-overdue/90 disabled:bg-risk-overdue/60",
};

export const buttonBase =
  "inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium transition-colors duration-150 ease-soft disabled:cursor-not-allowed";

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
