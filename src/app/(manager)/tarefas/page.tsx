import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonBase, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageFallback } from "@/components/ui/page-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { STATUS_LABEL, URGENCY_LABEL, formatDateTime } from "@/lib/format";
import { toRiskLevel } from "@/lib/risk";
import { createClient } from "@/lib/supabase/server";
import { TASK_STATUSES, taskRiskFilter, taskStatusFilter } from "@/lib/validation/task";

export const metadata: Metadata = { title: "Tarefas · Expedito" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Filter = { status?: string; risk?: string };

function filterHref({ status, risk }: Filter) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (risk) params.set("risco", risk);
  const query = params.toString();
  return query ? `/tarefas?${query}` : "/tarefas";
}

function FilterLinks({
  label,
  items,
  isActive,
}: {
  label: string;
  items: { key: string; label: string; href: string }[];
  isActive: (key: string) => boolean;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1">
      {items.map((item) => {
        const current = isActive(item.key);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors duration-150 ${
              current ? "bg-ink text-paper" : "text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Filters({ status, risk }: Filter) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <FilterLinks
        label="Filtrar por status"
        isActive={(key) => key === (status ?? "all")}
        items={[
          { key: "all", label: "Todas", href: filterHref({ risk }) },
          ...TASK_STATUSES.map((s) => ({
            key: s,
            label: STATUS_LABEL[s],
            href: filterHref({ status: s, risk }),
          })),
        ]}
      />
      <FilterLinks
        label="Filtrar por risco"
        isActive={(key) => key === (risk ?? "all")}
        items={[
          { key: "all", label: "Qualquer prazo", href: filterHref({ status }) },
          { key: "overdue", label: "Atrasadas", href: filterHref({ status, risk: "overdue" }) },
          { key: "at_risk", label: "Em risco", href: filterHref({ status, risk: "at_risk" }) },
        ]}
      />
    </div>
  );
}

async function TaskList({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = taskStatusFilter.parse(params.status);
  const risk = taskRiskFilter.parse(params.risco);

  const supabase = await createClient();
  let query = supabase
    .from("tasks_with_risk")
    .select("id, document_ref, agency_name, assigned_to, due_at, urgency, status, risk_level")
    .order("due_at");
  if (status) query = query.eq("status", status);
  if (risk) query = query.eq("risk_level", risk);

  const [{ data: tasks, error }, { data: members }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, full_name").eq("role", "field"),
  ]);
  const memberName = new Map((members ?? []).map((m) => [m.id, m.full_name]));

  return (
    <>
      <Filters status={status} risk={risk} />
      <div className="mt-6">
        {error ? (
          <p role="alert" className="text-sm text-risk-overdue">
            Não foi possível carregar as tarefas.
          </p>
        ) : !tasks.length ? (
          status || risk ? (
            <p className="border-y border-line py-12 text-center text-muted">
              Nenhuma tarefa com esses filtros.
            </p>
          ) : (
            <EmptyState
              message="Nenhuma tarefa cadastrada ainda."
              actionHref="/tarefas/nova"
              actionLabel="Cadastrar a primeira tarefa"
            />
          )
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-label uppercase text-muted">
                <th scope="col" className="py-3 pr-4 font-medium">Documento</th>
                <th scope="col" className="py-3 pr-4 font-medium">Prazo</th>
                <th scope="col" className="hidden py-3 pr-4 font-medium md:table-cell">
                  Responsável
                </th>
                <th scope="col" className="hidden py-3 pr-4 font-medium sm:table-cell">
                  Urgência
                </th>
                <th scope="col" className="py-3 pr-4 font-medium">Status</th>
                <th scope="col" className="py-3 font-medium">Risco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {tasks.map((task) => (
                <tr key={task.id} className="align-top">
                  <td className="py-4 pr-4">
                    <Link
                      href={`/tarefas/${task.id}`}
                      className="font-medium text-ink underline-offset-4 hover:underline"
                    >
                      {task.document_ref}
                    </Link>
                    <p className="mt-1 text-muted">{task.agency_name}</p>
                  </td>
                  <td className="py-4 pr-4 tabular-nums whitespace-nowrap">
                    {formatDateTime(task.due_at)}
                  </td>
                  <td className="hidden py-4 pr-4 md:table-cell">
                    {task.assigned_to ? (
                      memberName.get(task.assigned_to) ?? "—"
                    ) : (
                      <span className="text-muted">Sem responsável</span>
                    )}
                  </td>
                  <td className="hidden py-4 pr-4 sm:table-cell">
                    {URGENCY_LABEL[task.urgency]}
                  </td>
                  <td className="py-4 pr-4">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="py-4">
                    <RiskBadge level={toRiskLevel(task.risk_level)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export default function TarefasPage({ searchParams }: PageProps<"/tarefas">) {
  return (
    <>
      <PageHeader
        eyebrow="Cadastro"
        title="Tarefas"
        action={
          <Link
            href="/tarefas/nova"
            className={`${buttonBase} ${buttonVariants.primary}`}
          >
            Nova tarefa
          </Link>
        }
      />
      <div className="mt-12">
        <Suspense fallback={<PageFallback />}>
          <TaskList searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
