import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonBase, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageFallback } from "@/components/ui/page-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { STATUS_LABEL, URGENCY_LABEL, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { TASK_STATUSES, taskStatusFilter } from "@/lib/validation/task";

export const metadata: Metadata = { title: "Tarefas · Expedito" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function StatusFilter({ active }: { active: string | undefined }) {
  const items = [
    { value: undefined, label: "Todas" },
    ...TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
  ];
  return (
    <nav aria-label="Filtrar por status" className="flex flex-wrap gap-1">
      {items.map((item) => {
        const current = item.value === active;
        return (
          <Link
            key={item.label}
            href={item.value ? `/tarefas?status=${item.value}` : "/tarefas"}
            aria-current={current ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors duration-150 ${
              current
                ? "bg-ink text-paper"
                : "text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

async function TaskList({ searchParams }: { searchParams: SearchParams }) {
  const status = taskStatusFilter.parse((await searchParams).status);

  const supabase = await createClient();
  let query = supabase
    .from("tasks_with_risk")
    .select("id, document_ref, agency_name, assigned_to, due_at, urgency, status")
    .order("due_at");
  if (status) query = query.eq("status", status);

  const [{ data: tasks, error }, { data: members }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, full_name").eq("role", "field"),
  ]);
  const memberName = new Map((members ?? []).map((m) => [m.id, m.full_name]));

  return (
    <>
      <StatusFilter active={status} />
      <div className="mt-6">
        {error ? (
          <p role="alert" className="text-sm text-risk-overdue">
            Não foi possível carregar as tarefas.
          </p>
        ) : !tasks.length ? (
          status ? (
            <p className="border-y border-line py-12 text-center text-muted">
              Nenhuma tarefa com status “{STATUS_LABEL[status]}”.
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
                <th scope="col" className="py-3 font-medium">Status</th>
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
                  <td className="py-4">
                    <StatusBadge status={task.status} />
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
