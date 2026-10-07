import "server-only";
import { formatDateTime, formatTime, saoPauloDayRange } from "@/lib/format";
import { toRiskLevel, type RiskLevel } from "@/lib/risk";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export type DashboardTask = {
  id: string;
  documentRef: string;
  agencyName: string;
  /** "fecha 17:00" já formatado (evita divergência servidor/navegador). */
  agencyClosesLabel: string | null;
  assigneeName: string | null;
  dueAt: string;
  dueLabel: string;
  urgency: Enums<"task_urgency">;
  status: Enums<"task_status">;
  riskLevel: RiskLevel;
  occurrenceCount: number;
};

export type DashboardData = {
  tasks: DashboardTask[];
  counters: { overdue: number; atRisk: number; doneToday: number };
  generatedAt: string;
};

const RISK_RANK: Record<RiskLevel, number> = {
  overdue: 0,
  at_risk: 1,
  ok: 2,
  none: 2,
};

// Painel do gestor (CLAUDE.md, seção 4.6): tarefas com prazo hoje e as
// atrasadas de qualquer dia. O risco vem pronto da view tasks_with_risk.
export async function loadDashboard(): Promise<DashboardData> {
  const supabase = await createClient();
  const now = new Date();
  const { start, end } = saoPauloDayRange(now);

  const countOnly = () =>
    supabase
      .from("tasks_with_risk")
      .select("id", { count: "exact", head: true });

  const [tasksResult, members, overdue, atRisk, doneToday] = await Promise.all([
    supabase
      .from("tasks_with_risk")
      .select(
        "id, document_ref, agency_name, agency_closes_at, assigned_to, due_at, urgency, status, risk_level",
      )
      .or(`and(due_at.gte.${start},due_at.lt.${end}),risk_level.eq.overdue`)
      .order("due_at"),
    supabase.from("profiles").select("id, full_name").eq("role", "field"),
    countOnly().eq("risk_level", "overdue"),
    countOnly().eq("risk_level", "at_risk"),
    countOnly()
      .eq("status", "done")
      .gte("completed_at", start)
      .lt("completed_at", end),
  ]);

  if (tasksResult.error) throw tasksResult.error;

  const taskIds = tasksResult.data.map((t) => t.id);
  const { data: occurrences } = taskIds.length
    ? await supabase.from("task_occurrences").select("task_id").in("task_id", taskIds)
    : { data: [] };
  const occurrenceCount = new Map<string, number>();
  for (const o of occurrences ?? []) {
    occurrenceCount.set(o.task_id, (occurrenceCount.get(o.task_id) ?? 0) + 1);
  }

  const memberName = new Map(
    (members.data ?? []).map((m) => [m.id, m.full_name]),
  );

  const tasks = tasksResult.data
    .map(
      (t): DashboardTask => ({
        id: t.id,
        documentRef: t.document_ref,
        agencyName: t.agency_name,
        agencyClosesLabel: t.agency_closes_at
          ? `fecha ${formatTime(t.agency_closes_at)}`
          : null,
        assigneeName: t.assigned_to ? (memberName.get(t.assigned_to) ?? null) : null,
        dueAt: t.due_at,
        dueLabel: formatDateTime(t.due_at),
        urgency: t.urgency,
        status: t.status,
        riskLevel: toRiskLevel(t.risk_level),
        occurrenceCount: occurrenceCount.get(t.id) ?? 0,
      }),
    )
    // Mais críticas primeiro, depois por prazo (a ordem do banco é estável).
    .sort((a, b) => RISK_RANK[a.riskLevel] - RISK_RANK[b.riskLevel]);

  return {
    tasks,
    counters: {
      overdue: overdue.count ?? 0,
      atRisk: atRisk.count ?? 0,
      doneToday: doneToday.count ?? 0,
    },
    generatedAt: now.toISOString(),
  };
}
