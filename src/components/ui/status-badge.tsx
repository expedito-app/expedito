import { STATUS_LABEL } from "@/lib/format";
import type { Enums } from "@/types/database";

// Status é neutro: as cores de estado ficam reservadas ao risco (seção 3.4).
const dot: Record<Enums<"task_status">, string> = {
  pending: "border border-muted",
  in_progress: "bg-accent",
  done: "bg-ink",
  problem: "bg-ink ring-2 ring-ink/20",
};

export function StatusBadge({ status }: { status: Enums<"task_status"> }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
      <span aria-hidden className={`size-2 rounded-full ${dot[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}
