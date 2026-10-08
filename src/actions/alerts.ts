"use server";

import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";
import { OCCURRENCE_LABEL, formatClock, saoPauloDayRange } from "@/lib/format";
import { toRiskLevel } from "@/lib/risk";
import { createClient } from "@/lib/supabase/server";

export type Alert = {
  /** Muda quando a situação piora (em risco → atrasada), para avisar de novo. */
  id: string;
  tone: "overdue" | "at_risk" | "info";
  title: string;
  detail: string;
  href: string;
};

const SOON_MINUTES = 30;
const sinceSchema = z.iso.datetime().optional().catch(undefined);

/**
 * Avisos para os pop-ups (gestor e campo). O RLS limita às tarefas que o
 * usuário pode ver; o risco vem pronto da view tasks_with_risk.
 */
export async function loadAlerts(since: unknown): Promise<Alert[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];
  const isManager = profile.role === "manager";
  const supabase = await createClient();
  const now = new Date();
  const { end } = saoPauloDayRange(now);

  const { data: tasks } = await supabase
    .from("tasks_with_risk")
    .select("id, document_ref, agency_name, assigned_to, due_at, status, risk_level")
    .neq("status", "done")
    .lt("due_at", end)
    .in("risk_level", ["overdue", "at_risk"])
    .order("due_at")
    .limit(50);

  const href = (taskId: string) => (isManager ? `/tarefas/${taskId}` : "/hoje");
  const alerts: Alert[] = [];

  for (const t of tasks ?? []) {
    const level = toRiskLevel(t.risk_level);
    const minutes = (Date.parse(t.due_at) - now.getTime()) / 60_000;
    if (level === "overdue") {
      alerts.push({
        id: `overdue:${t.id}`,
        tone: "overdue",
        title: `${t.document_ref} está atrasada`,
        detail: `${t.agency_name} · prazo era ${formatClock(t.due_at)}`,
        href: href(t.id),
      });
    } else if (minutes <= SOON_MINUTES) {
      alerts.push({
        id: `soon:${t.id}`,
        tone: "at_risk",
        title: `${t.document_ref} vence em ${Math.max(1, Math.round(minutes))} min`,
        detail: `${t.agency_name} · prazo ${formatClock(t.due_at)}`,
        href: href(t.id),
      });
    } else {
      alerts.push({
        id: `risk:${t.id}`,
        tone: "at_risk",
        title: `${t.document_ref} entrou em risco`,
        detail: `${t.agency_name} · prazo ${formatClock(t.due_at)}`,
        href: href(t.id),
      });
    }
  }

  if (isManager) {
    // Sem responsável com prazo hoje: ninguém vai buscar.
    const unassigned = (tasks ?? []).filter((t) => !t.assigned_to);
    for (const t of unassigned) {
      alerts.push({
        id: `unassigned:${t.id}`,
        tone: "info",
        title: `${t.document_ref} está sem responsável`,
        detail: `${t.agency_name} · prazo ${formatClock(t.due_at)}`,
        href: href(t.id),
      });
    }

    // Ocorrências registradas pelo campo desde a última consulta (máx. 2 h).
    const floor = new Date(now.getTime() - 2 * 3_600_000).toISOString();
    const parsedSince = sinceSchema.parse(since);
    const from = parsedSince && parsedSince > floor ? parsedSince : floor;
    const { data: occurrences } = await supabase
      .from("task_occurrences")
      .select("id, task_id, type, created_at")
      .gt("created_at", from)
      .order("created_at", { ascending: false })
      .limit(10);
    if (occurrences?.length) {
      const { data: refs } = await supabase
        .from("tasks")
        .select("id, document_ref")
        .in("id", occurrences.map((o) => o.task_id));
      const refById = new Map((refs ?? []).map((r) => [r.id, r.document_ref]));
      for (const o of occurrences) {
        alerts.push({
          id: `occurrence:${o.id}`,
          tone: "info",
          title: `Ocorrência em ${refById.get(o.task_id) ?? "tarefa"}`,
          detail: `${OCCURRENCE_LABEL[o.type]} · ${formatClock(o.created_at)}`,
          href: href(o.task_id),
        });
      }
    }
  }

  // Atrasadas primeiro, depois as que vencem logo.
  const rank = { overdue: 0, at_risk: 1, info: 2 } as const;
  return alerts.sort((a, b) => rank[a.tone] - rank[b.tone]);
}
