import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, action }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-label font-medium uppercase text-muted">{eyebrow}</p>
        <h1 className="mt-2 text-display font-semibold">{title}</h1>
      </div>
      {action}
    </div>
  );
}
