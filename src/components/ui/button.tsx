import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

const variants = {
  primary:
    "bg-accent text-accent-ink hover:bg-accent/90 disabled:bg-accent/60",
  ghost:
    "border border-line text-ink hover:bg-surface disabled:text-muted",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-medium transition-colors duration-150 ease-soft disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
