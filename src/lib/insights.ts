import "server-only";
import { OCCURRENCE_LABEL, fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import { addDays, previousPeriod, todayInSaoPaulo, type Period } from "@/lib/period";
import { toRiskLevel } from "@/lib/risk";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

// Indicadores de gestão (página /indicadores). Tudo calculado no servidor a
// partir das tarefas que o RLS deixa o gestor ler. "Atrasou" = concluída depois
// do prazo OU vencida e ainda aberta (risk_level = overdue, regra da view).

type Supabase = Awaited<ReturnType<typeof createClient>>;

type TaskRow = {
  id: string;
  document_ref: string;
  agency_id: string;
  agency_name: string;
  assigned_to: string | null;
  due_at: string;
  completed_at: string | null;
  created_at: string;
  status: Enums<"task_status">;
  urgency: Enums<"task_urgency">;
  risk_level: string;
};

type OccurrenceRow = {
  task_id: string;
  type: Enums<"occurrence_type">;
  created_at: string;
};

const PAGE = 1000;
const TASK_COLUMNS =
  "id, document_ref, agency_id, agency_name, assigned_to, due_at, completed_at, created_at, status, urgency, risk_level";

/** Tarefas com prazo no intervalo, paginando (o PostgREST limita a 1000 por chamada). */
async function fetchTasks(supabase: Supabase, start: string, end: string): Promise<TaskRow[]> {
  const rows: TaskRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("tasks_with_risk")
      .select(TASK_COLUMNS)
      .gte("due_at", start)
      .lt("due_at", end)
      .order("due_at")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

async function fetchOccurrences(
  supabase: Supabase,
  start: string,
  end: string,
): Promise<OccurrenceRow[]> {
  const rows: OccurrenceRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("task_occurrences")
      .select("task_id, type, created_at")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

export type Outcome = "on_time" | "late_done" | "late_open" | "open";

function outcomeOf(t: TaskRow): Outcome {
  if (t.status === "done") {
    return t.completed_at && t.completed_at > t.due_at ? "late_done" : "on_time";
  }
  return toRiskLevel(t.risk_level) === "overdue" ? "late_open" : "open";
}

const hoursBetween = (a: string, b: string) =>
  (Date.parse(b) - Date.parse(a)) / 3_600_000;

export type Totals = {
  total: number;
  done: number;
  onTime: number;
  lateDone: number;
  lateOpen: number;
  open: number;
  /** Concluídas no prazo ÷ (concluídas + vencidas abertas). null sem base. */
  onTimeRate: number | null;
  avgDelayHours: number | null;
  avgCycleHours: number | null;
  occurrences: number;
};

function totalsOf(tasks: TaskRow[], occurrences: number): Totals {
  let onTime = 0;
  let lateDone = 0;
  let lateOpen = 0;
  let open = 0;
  let delaySum = 0;
  let cycleSum = 0;
  for (const t of tasks) {
    const outcome = outcomeOf(t);
    if (outcome === "on_time") onTime++;
    else if (outcome === "late_done") lateDone++;
    else if (outcome === "late_open") lateOpen++;
    else open++;
    if (outcome === "late_done" && t.completed_at) {
      delaySum += hoursBetween(t.due_at, t.completed_at);
    }
    if (t.status === "done" && t.completed_at) {
      cycleSum += Math.max(0, hoursBetween(t.created_at, t.completed_at));
    }
  }
  const done = onTime + lateDone;
  const base = done + lateOpen;
  return {
    total: tasks.length,
    done,
    onTime,
    lateDone,
    lateOpen,
    open,
    onTimeRate: base ? onTime / base : null,
    avgDelayHours: lateDone ? delaySum / lateDone : null,
    avgCycleHours: done ? cycleSum / done : null,
    occurrences,
  };
}

export type Bucket = {
  key: string;
  label: string;
  onTime: number;
  late: number;
  open: number;
};

export type Granularity = "day" | "week" | "month";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

function bucketKey(date: string, granularity: Granularity): string {
  if (granularity === "day") return date;
  if (granularity === "month") return date.slice(0, 7);
  // Semana começando na segunda-feira.
  const offset = (weekdayOf(date) + 6) % 7;
  return addDays(date, -offset);
}

function bucketLabel(key: string, granularity: Granularity): string {
  if (granularity === "month") {
    const [y, m] = key.split("-");
    return `${MONTHS[Number(m) - 1]}/${y.slice(2)}`;
  }
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
}

function buildSeries(tasks: TaskRow[], period: Period): { granularity: Granularity; buckets: Bucket[] } {
  const granularity: Granularity =
    period.days <= 45 ? "day" : period.days <= 190 ? "week" : "month";

  // Todos os buckets do período, inclusive os vazios (o eixo não pula datas).
  const buckets = new Map<string, Bucket>();
  for (let d = period.fromDate; d <= period.toDate; d = addDays(d, 1)) {
    const key = bucketKey(d, granularity);
    if (!buckets.has(key)) {
      buckets.set(key, { key, label: bucketLabel(key, granularity), onTime: 0, late: 0, open: 0 });
    }
  }
  for (const t of tasks) {
    const key = bucketKey(toDateTimeLocal(t.due_at).slice(0, 10), granularity);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const outcome = outcomeOf(t);
    if (outcome === "on_time") bucket.onTime++;
    else if (outcome === "open") bucket.open++;
    else bucket.late++;
  }
  return { granularity, buckets: [...buckets.values()] };
}

export type MemberStat = {
  id: string | null;
  name: string;
  total: number;
  done: number;
  late: number;
  onTimeRate: number | null;
  perActiveDay: number;
};

export type AgencyStat = {
  id: string;
  name: string;
  total: number;
  late: number;
  lateRate: number;
  occurrences: number;
  byType: Record<Enums<"occurrence_type">, number>;
};

export type HeatCell = { weekday: number; hour: number; count: number };

export type ForecastDay = {
  date: string;
  label: string;
  count: number;
  perMember: number;
  aboveNormal: boolean;
};

export type InsightsData = {
  period: Period;
  totals: Totals;
  previous: Totals;
  granularity: Granularity;
  series: Bucket[];
  members: MemberStat[];
  agencies: AgencyStat[];
  occurrenceByType: { type: Enums<"occurrence_type">; label: string; count: number }[];
  heatmap: { cells: HeatCell[]; hours: number[]; max: number };
  busiest: { label: string; count: number } | null;
  forecast: { days: ForecastDay[]; teamSize: number; normalDaily: number };
  /** Dias de atraso somados (cada atraso conta ao menos 1 dia), para a estimativa de custo. */
  lateDays: number;
  /** Linhas prontas para exportar (CSV). */
  rows: ExportRow[];
};

export type ExportRow = {
  documentRef: string;
  agency: string;
  member: string;
  urgency: Enums<"task_urgency">;
  status: Enums<"task_status">;
  dueAt: string;
  completedAt: string | null;
  outcome: Outcome;
  delayHours: number | null;
};

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

export async function loadInsights(period: Period): Promise<InsightsData> {
  const supabase = await createClient();
  const now = new Date();
  const prev = previousPeriod(period);
  const today = todayInSaoPaulo(now);
  const forecastEnd = addDays(today, 7);

  const [tasks, occurrences, prevTasks, prevOccurrences, members, upcoming] = await Promise.all([
    fetchTasks(supabase, period.start, period.end),
    fetchOccurrences(supabase, period.start, period.end),
    fetchTasks(supabase, prev.start, prev.end),
    fetchOccurrences(supabase, prev.start, prev.end),
    supabase.from("profiles").select("id, full_name").eq("role", "field").order("full_name"),
    supabase
      .from("tasks")
      .select("due_at")
      .neq("status", "done")
      .gte("due_at", now.toISOString())
      .lt("due_at", fromDateTimeLocal(`${forecastEnd}T00:00`)),
  ]);

  const memberName = new Map((members.data ?? []).map((m) => [m.id, m.full_name]));
  const teamSize = Math.max(1, memberName.size);

  // Por pessoa
  const byMember = new Map<string, { tasks: TaskRow[]; days: Set<string> }>();
  for (const t of tasks) {
    const key = t.assigned_to ?? "";
    const entry = byMember.get(key) ?? { tasks: [], days: new Set<string>() };
    entry.tasks.push(t);
    entry.days.add(toDateTimeLocal(t.due_at).slice(0, 10));
    byMember.set(key, entry);
  }
  const memberStats: MemberStat[] = [...byMember.entries()]
    .map(([id, entry]) => {
      const totals = totalsOf(entry.tasks, 0);
      return {
        id: id || null,
        name: id ? (memberName.get(id) ?? "Ex-integrante") : "Sem responsável",
        total: totals.total,
        done: totals.done,
        late: totals.lateDone + totals.lateOpen,
        onTimeRate: totals.onTimeRate,
        perActiveDay: entry.days.size ? totals.total / entry.days.size : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  // Por agência (ocorrências ligadas às tarefas do período e às de fora dele)
  const taskAgency = new Map(tasks.map((t) => [t.id, t.agency_id]));
  const missing = [...new Set(occurrences.map((o) => o.task_id).filter((id) => !taskAgency.has(id)))];
  if (missing.length) {
    for (let i = 0; i < missing.length; i += 200) {
      const { data } = await supabase
        .from("tasks_with_risk")
        .select("id, agency_id, agency_name")
        .in("id", missing.slice(i, i + 200));
      for (const t of data ?? []) taskAgency.set(t.id, t.agency_id);
    }
  }
  const agencyNames = new Map<string, string>();
  for (const t of tasks) agencyNames.set(t.agency_id, t.agency_name);
  const { data: agencyList } = await supabase.from("agencies").select("id, name");
  for (const a of agencyList ?? []) agencyNames.set(a.id, a.name);

  const agencyMap = new Map<string, AgencyStat>();
  const agencyEntry = (id: string): AgencyStat => {
    let entry = agencyMap.get(id);
    if (!entry) {
      entry = {
        id,
        name: agencyNames.get(id) ?? "Agência removida",
        total: 0,
        late: 0,
        lateRate: 0,
        occurrences: 0,
        byType: { agency_closed: 0, missing_document: 0, other: 0 },
      };
      agencyMap.set(id, entry);
    }
    return entry;
  };
  for (const t of tasks) {
    const entry = agencyEntry(t.agency_id);
    entry.total++;
    const outcome = outcomeOf(t);
    if (outcome === "late_done" || outcome === "late_open") entry.late++;
  }
  const typeCount: Record<Enums<"occurrence_type">, number> = {
    agency_closed: 0,
    missing_document: 0,
    other: 0,
  };
  for (const o of occurrences) {
    typeCount[o.type]++;
    const agencyId = taskAgency.get(o.task_id);
    if (!agencyId) continue;
    const entry = agencyEntry(agencyId);
    entry.occurrences++;
    entry.byType[o.type]++;
  }
  const agencyStats = [...agencyMap.values()]
    .map((a) => ({ ...a, lateRate: a.total ? a.late / a.total : 0 }))
    .sort((a, b) => b.late + b.occurrences - (a.late + a.occurrences) || b.total - a.total);

  // Mapa de calor: dia da semana × hora do prazo
  const heat = new Map<string, number>();
  const dailyCounts = new Map<string, number>();
  for (const t of tasks) {
    const local = toDateTimeLocal(t.due_at);
    const date = local.slice(0, 10);
    const hour = Number(local.slice(11, 13));
    const key = `${weekdayOf(date)}-${hour}`;
    heat.set(key, (heat.get(key) ?? 0) + 1);
    dailyCounts.set(date, (dailyCounts.get(date) ?? 0) + 1);
  }
  const usedHours = [...heat.keys()].map((k) => Number(k.split("-")[1]));
  const minHour = Math.min(7, ...usedHours);
  const maxHour = Math.max(18, ...usedHours);
  const hours = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);
  const cells: HeatCell[] = [];
  for (const weekday of [1, 2, 3, 4, 5, 6, 0]) {
    for (const hour of hours) {
      cells.push({ weekday, hour, count: heat.get(`${weekday}-${hour}`) ?? 0 });
    }
  }

  // Pico: o mês (ou dia, em períodos curtos) com mais tarefas
  const series = buildSeries(tasks, period);
  const peak = series.buckets.reduce<Bucket | null>(
    (best, b) => (!best || b.onTime + b.late + b.open > best.onTime + best.late + best.open ? b : best),
    null,
  );
  const peakCount = peak ? peak.onTime + peak.late + peak.open : 0;

  // Previsão: tarefas já cadastradas para os próximos 7 dias vs. o normal do período
  const activeDays = [...dailyCounts.values()];
  const normalDaily = activeDays.length
    ? activeDays.reduce((s, n) => s + n, 0) / activeDays.length
    : 0;
  const high = percentile(activeDays, 0.9);
  const upcomingByDay = new Map<string, number>();
  for (const t of upcoming.data ?? []) {
    const date = toDateTimeLocal(t.due_at).slice(0, 10);
    upcomingByDay.set(date, (upcomingByDay.get(date) ?? 0) + 1);
  }
  const forecastDays: ForecastDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i);
    const count = upcomingByDay.get(date) ?? 0;
    return {
      date,
      label: `${WEEKDAYS[weekdayOf(date)]} ${date.slice(8, 10)}/${date.slice(5, 7)}`,
      count,
      perMember: count / teamSize,
      aboveNormal: activeDays.length >= 5 && count > high,
    };
  });

  let lateDays = 0;
  const rows: ExportRow[] = tasks.map((t) => {
    const outcome = outcomeOf(t);
    const delayHours =
      outcome === "late_done" && t.completed_at
        ? hoursBetween(t.due_at, t.completed_at)
        : outcome === "late_open"
          ? hoursBetween(t.due_at, now.toISOString())
          : null;
    if (delayHours !== null) lateDays += Math.max(1, Math.ceil(delayHours / 24));
    return {
      documentRef: t.document_ref,
      agency: t.agency_name,
      member: t.assigned_to ? (memberName.get(t.assigned_to) ?? "") : "",
      urgency: t.urgency,
      status: t.status,
      dueAt: t.due_at,
      completedAt: t.completed_at,
      outcome,
      delayHours,
    };
  });

  return {
    period,
    totals: totalsOf(tasks, occurrences.length),
    previous: totalsOf(prevTasks, prevOccurrences.length),
    granularity: series.granularity,
    series: series.buckets,
    members: memberStats,
    agencies: agencyStats,
    occurrenceByType: (Object.keys(typeCount) as Enums<"occurrence_type">[]).map((type) => ({
      type,
      label: OCCURRENCE_LABEL[type],
      count: typeCount[type],
    })),
    heatmap: { cells, hours, max: Math.max(0, ...cells.map((c) => c.count)) },
    busiest: peak && peakCount ? { label: peak.label, count: peakCount } : null,
    forecast: { days: forecastDays, teamSize: memberName.size, normalDaily },
    lateDays,
    rows,
  };
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  on_time: "No prazo",
  late_done: "Concluída com atraso",
  late_open: "Atrasada (aberta)",
  open: "Em aberto",
};

export const WEEKDAY_LABEL = WEEKDAYS;
