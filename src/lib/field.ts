import "server-only";
import {
  formatDateTime,
  formatOpeningHours,
  saoPauloDayRange,
} from "@/lib/format";
import { toRiskLevel, type RiskLevel } from "@/lib/risk";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export type FieldTask = {
  id: string;
  documentRef: string;
  description: string | null;
  agencyName: string;
  agencyAddress: string | null;
  agencyHours: string;
  agencyRequirements: string | null;
  dueLabel: string;
  urgency: Enums<"task_urgency">;
  status: Enums<"task_status">;
  riskLevel: RiskLevel;
};

export type FieldDay = {
  tasks: FieldTask[];
  doneToday: number;
};

const RISK_RANK: Record<RiskLevel, number> = { overdue: 0, at_risk: 1, ok: 2, none: 2 };

// Tela de campo (CLAUDE.md, seção 4.6). O RLS já limita às tarefas
// atribuídas ao usuário logado e às agências do seu gestor.
export async function loadFieldDay(): Promise<FieldDay> {
  const supabase = await createClient();
  const { start, end } = saoPauloDayRange(new Date());

  const [tasksResult, doneToday] = await Promise.all([
    supabase
      .from("tasks_with_risk")
      .select("id, document_ref, description, agency_id, due_at, urgency, status, risk_level")
      .neq("status", "done")
      .order("due_at"),
    supabase
      .from("tasks_with_risk")
      .select("id", { count: "exact", head: true })
      .eq("status", "done")
      .gte("completed_at", start)
      .lt("completed_at", end),
  ]);
  if (tasksResult.error) throw tasksResult.error;

  const agencyIds = [...new Set(tasksResult.data.map((t) => t.agency_id))];
  const { data: agencies } = agencyIds.length
    ? await supabase
        .from("agencies")
        .select("id, name, address, opens_at, closes_at, requirements")
        .in("id", agencyIds)
    : { data: [] };
  const agencyById = new Map((agencies ?? []).map((a) => [a.id, a]));

  const tasks = tasksResult.data
    .map((t): FieldTask => {
      const agency = agencyById.get(t.agency_id);
      return {
        id: t.id,
        documentRef: t.document_ref,
        description: t.description,
        agencyName: agency?.name ?? "",
        agencyAddress: agency?.address ?? null,
        agencyHours: agency ? formatOpeningHours(agency.opens_at, agency.closes_at) : "",
        agencyRequirements: agency?.requirements ?? null,
        dueLabel: formatDateTime(t.due_at),
        urgency: t.urgency,
        status: t.status,
        riskLevel: toRiskLevel(t.risk_level),
      };
    })
    .sort((a, b) => RISK_RANK[a.riskLevel] - RISK_RANK[b.riskLevel]);

  return { tasks, doneToday: doneToday.count ?? 0 };
}
