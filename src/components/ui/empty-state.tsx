import Link from "next/link";

type EmptyStateProps = {
  message: string;
  actionHref: string;
  actionLabel: string;
};

export function EmptyState({ message, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="border-y border-line py-12 text-center">
      <p className="text-muted">{message}</p>
      <Link
        href={actionHref}
        className="mt-3 inline-block font-medium text-accent underline-offset-4 hover:underline"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
