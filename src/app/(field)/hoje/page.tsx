import type { Metadata } from "next";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/features/auto-refresh";
import { FieldTaskList } from "@/components/features/field-task-list";
import { PageFallback } from "@/components/ui/page-fallback";
import { loadFieldDay } from "@/lib/field";

export const metadata: Metadata = { title: "Hoje · Expedito" };

async function FieldDay() {
  const { tasks, doneToday } = await loadFieldDay();
  return (
    <>
      <p className="mt-2 text-muted">
        {tasks.length
          ? `${tasks.length} ${tasks.length === 1 ? "visita pendente" : "visitas pendentes"}`
          : "Nenhuma visita pendente."}
      </p>
      <div className="mt-6">
        <FieldTaskList tasks={tasks} />
      </div>
      <p className="card mt-6 flex items-center justify-between py-5 text-sm text-muted">
        Concluídas hoje <span className="text-title font-light tabular-nums text-ink">{doneToday}</span>
      </p>
      <AutoRefresh intervalMs={60_000} />
    </>
  );
}

export default function HojePage() {
  return (
    <>
      <p className="text-label font-medium uppercase text-muted">Hoje</p>
      <h1 className="mt-2 text-display font-semibold">Suas tarefas</h1>
      <Suspense fallback={<PageFallback />}>
        <FieldDay />
      </Suspense>
    </>
  );
}
