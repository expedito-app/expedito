import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/features/auto-refresh";
import { DashboardCounters } from "@/components/features/dashboard-counters";
import { DashboardList } from "@/components/features/dashboard-list";
import { SavingsCard } from "@/components/features/savings-card";
import { buttonBase, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageFallback } from "@/components/ui/page-fallback";
import { loadDashboard } from "@/lib/dashboard";
import { loadMonthSavings } from "@/lib/insights";
import { formatClock, formatLongDate } from "@/lib/format";

export const metadata: Metadata = { title: "Painel · Expedito" };

const REFRESH_MS = 60_000;

async function Dashboard() {
  const [{ tasks, counters, generatedAt }, month] = await Promise.all([
    loadDashboard(),
    loadMonthSavings(),
  ]);
  return (
    <>
      <p className="mt-2 text-muted first-letter:uppercase">
        {formatLongDate(new Date(generatedAt))}
      </p>
      <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(18rem,1fr)]">
        <DashboardCounters counters={counters} />
        <SavingsCard savings={month.savings} monthLabel={month.monthLabel} />
      </div>
      <div className="mt-4">
        {tasks.length ? (
          <DashboardList tasks={tasks} />
        ) : (
          <EmptyState
            message="Nenhuma tarefa para hoje e nada atrasado."
            actionHref="/tarefas/nova"
            actionLabel="Cadastrar tarefa"
          />
        )}
      </div>
      <p className="mt-10 text-sm text-muted" aria-live="polite">
        Atualizado às {formatClock(generatedAt)} · atualiza sozinho a cada minuto
      </p>
      <AutoRefresh intervalMs={REFRESH_MS} />
    </>
  );
}

export default function PainelPage() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-label font-medium uppercase text-muted">Hoje</p>
          <h1 className="mt-2 text-display font-semibold">
            Painel do dia
          </h1>
        </div>
        <Link
          href="/tarefas/nova"
          className={`${buttonBase} ${buttonVariants.primary}`}
        >
          Nova tarefa
        </Link>
      </div>
      <Suspense fallback={<PageFallback />}>
        <Dashboard />
      </Suspense>
    </>
  );
}
