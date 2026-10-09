import { STATUS_LABEL } from "@/lib/format";
import type { Enums } from "@/types/database";

// Status é categoria: pastel suave + rótulo (o risco tem as próprias cores).
const tone: Record<Enums<"task_status">, string> = {
  pending: "bg-canvas border border-line",
  in_progress: "bg-pastel-blue",
  done: "bg-pastel-lilac",
  problem: "bg-pastel-amber",
};

export function StatusBadge({ status }: { status: Enums<"task_status"> }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium text-ink ${tone[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
