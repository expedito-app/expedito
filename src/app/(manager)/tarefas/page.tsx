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
import {
  TASK_STATUSES,
  taskSearchFilter,
  taskStatusFilter,
} from "@/lib/validation/task";

export const metadata: Metadata = { title: "Tarefas · Expedito" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const LIST_LIMIT = 200;

function weekAgo(): string {
  return new Date(Date.now() - 7 * 86_400_000).toISOString();
}

function filterHref(status: string | undefined, q: string | undefined) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/tarefas?${query}` : "/tarefas";
}

// Busca pelo número do BL/documento (GET simples: funciona sem JavaScript).
function SearchForm({ q, status }: { q: string | undefined; status: string | undefined }) {
  return (
    <form role="search" action="/tarefas" className="flex gap-2">
      {status && <input type="hidden" name="status" value={status} />}
      <label htmlFor="q" className="sr-only">
        Buscar por BL ou documento
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Buscar BL ou documento"
        className="h-10 w-56 rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        className="h-10 rounded-md border border-line px-4 text-sm text-ink transition-colors duration-150 hover:bg-surface"
      >
        Buscar
      </button>
    </form>
  );
}

function StatusFilter({ active, q }: { active: string | undefined; q: string | undefined }) {
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
            href={filterHref(item.value, q)}
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
  const params = await searchParams;
  const status = taskStatusFilter.parse(params.status);
  const q = taskSearchFilter.parse(params.q);

  const supabase = await createClient();
  let query = supabase
    .from("tasks_with_risk")
    .select("id, document_ref, agency_name, assigned_to, due_at, urgency, status, risk_level")
    .order("due_at", { ascending: status !== "done" })
    .limit(LIST_LIMIT);
  if (status) query = query.eq("status", status);
  // Sem filtro: abertas + concluídas da última semana. O histórico antigo
  // aparece no filtro "Concluída", na busca e em Indicadores.
  if (!status && !q) {
    query = query.or(`status.neq.done,due_at.gte.${weekAgo()}`);
  }
  // % e _ são curingas do ILIKE: escapados para buscar o texto literal.
  if (q) query = query.ilike("document_ref", `%${q.replace(/[\\%_]/g, "\\$&")}%`);

  const [{ data: tasks, error }, { data: members }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, full_name").eq("role", "field"),
  ]);
  const memberName = new Map((members ?? []).map((m) => [m.id, m.full_name]));

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <StatusFilter active={status} q={q} />
        <SearchForm q={q} status={status} />
      </div>
      <div className="mt-6">
        {error ? (
          <p role="alert" className="text-sm text-risk-overdue">
            Não foi possível carregar as tarefas.
          </p>
        ) : !tasks.length ? (
          q ? (
            <p className="border-y border-line py-12 text-center text-muted">
              Nenhuma tarefa com “{q}”.
            </p>
          ) : status ? (
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
                <th scope="col" className="py-3 font-medium">Status e risco</th>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={task.status} />
                      <RiskBadge level={toRiskLevel(task.risk_level)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!error && tasks.length > 0 && (
          <p className="mt-6 text-sm text-muted">
            {tasks.length >= LIST_LIMIT
              ? `Mostrando as ${LIST_LIMIT} primeiras. Use a busca ou os filtros para achar outras.`
              : !status && !q
                ? "Concluídas há mais de 7 dias ficam no filtro “Concluída”, na busca e em Indicadores."
                : null}
          </p>
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
          <div className="flex gap-3">
            <Link
              href="/tarefas/importar"
              className={`${buttonBase} ${buttonVariants.ghost}`}
            >
              Importar planilha
            </Link>
            <Link
              href="/tarefas/nova"
              className={`${buttonBase} ${buttonVariants.primary}`}
            >
              Nova tarefa
            </Link>
          </div>
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
