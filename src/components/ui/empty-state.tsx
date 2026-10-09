import Link from "next/link";

type EmptyStateProps = {
  message: string;
  actionHref: string;
  actionLabel: string;
};

export function EmptyState({ message, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="card py-12 text-center">
      <p className="text-muted">{message}</p>
      <Link
        href={actionHref}
        className="mt-3 inline-block font-medium text-ink underline underline-offset-4"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
