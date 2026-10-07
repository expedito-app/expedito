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
      <p className="mt-8 border-t border-line pt-4 text-sm text-muted">
        Concluídas hoje: <span className="tabular-nums">{doneToday}</span>
      </p>
      <AutoRefresh intervalMs={60_000} />
    </>
  );
}

export default function HojePage() {
  return (
    <>
      <p className="text-label font-medium uppercase text-muted">Hoje</p>
      <h1 className="mt-2 font-serif text-title font-semibold">Suas tarefas</h1>
      <Suspense fallback={<PageFallback />}>
        <FieldDay />
      </Suspense>
    </>
  );
}
