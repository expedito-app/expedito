import "server-only";
import { fromDateTimeLocal, formatClock, toDateTimeLocal } from "@/lib/format";
import { addDays, todayInSaoPaulo } from "@/lib/period";
import {
  planRoute,
  suggestAssignee,
  type AssigneeSuggestion,
  type MemberDay,
  type RoutePlan,
  type RouteStop,
} from "@/lib/routing";
import { createClient } from "@/lib/supabase/server";
import type { TransportMode } from "@/lib/transport";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type AgencyGeo = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  opens_at: string | null;
  closes_at: string | null;
};

const DAY_START = "08:00";

/** Prazo efetivo: o menor entre o prazo e o fechamento da agência naquele dia. */
function deadlineOf(dueAt: string, closesAt: string | null): number {
  const due = Date.parse(dueAt);
  if (!closesAt) return due;
  const date = toDateTimeLocal(dueAt).slice(0, 10);
  const close = Date.parse(fromDateTimeLocal(`${date}T${closesAt.slice(0, 5)}`));
  return Math.min(due, close);
}

function toStop(
  task: { id: string; document_ref: string; agency_id: string; due_at: string },
  agency: AgencyGeo | undefined,
): RouteStop {
  return {
    taskId: task.id,
    documentRef: task.document_ref,
    agencyId: task.agency_id,
    agencyName: agency?.name ?? "",
    point:
      agency && agency.latitude !== null && agency.longitude !== null
        ? { lat: agency.latitude, lng: agency.longitude }
        : null,
    deadlineMs: deadlineOf(task.due_at, agency?.closes_at ?? null),
    dueAt: task.due_at,
  };
}

/** Saída da rota: agora (se for hoje e já passou das 8h) ou 08:00 do dia. */
function startOf(date: string, now: Date): number {
  const dayStart = Date.parse(fromDateTimeLocal(`${date}T${DAY_START}`));
  return date === todayInSaoPaulo(now) ? Math.max(dayStart, now.getTime()) : dayStart;
}

async function loadAgencies(supabase: Supabase): Promise<Map<string, AgencyGeo>> {
  const { data } = await supabase
    .from("agencies")
    .select("id, name, latitude, longitude, opens_at, closes_at");
  return new Map((data ?? []).map((a) => [a.id, a]));
}

/** Tarefas abertas de um dia (e, se for hoje, as atrasadas de antes). */
async function openTasksOf(supabase: Supabase, date: string, now: Date) {
  const start = fromDateTimeLocal(`${date}T00:00`);
  const end = fromDateTimeLocal(`${addDays(date, 1)}T00:00`);
  let query = supabase
    .from("tasks")
    .select("id, document_ref, agency_id, assigned_to, due_at, status")
    .neq("status", "done")
    .lt("due_at", end)
    .order("due_at");
  // Hoje: entram também as atrasadas de dias anteriores (ainda precisam ser feitas).
  if (date !== todayInSaoPaulo(now)) query = query.gte("due_at", start);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export type MemberRoute = {
  id: string;
  name: string;
  mode: TransportMode;
  plan: RoutePlan;
  /** Rótulos prontos (datas formatadas no servidor). */
  labels: Record<string, { eta: string; due: string }>;
};

export type DayRoutes = {
  date: string;
  members: MemberRoute[];
  unassigned: { id: string; documentRef: string; agencyName: string; due: string }[];
  missingCoords: string[];
};

function labelsOf(plan: RoutePlan): MemberRoute["labels"] {
  return Object.fromEntries(
    plan.stops.map((s) => [
      s.taskId,
      { eta: formatClock(new Date(s.etaMs).toISOString()), due: formatClock(s.dueAt) },
    ]),
  );
}

/** Rotas do dia de toda a equipe (tela /rotas do gestor). */
export async function loadDayRoutes(date: string): Promise<DayRoutes> {
  const supabase = await createClient();
  const now = new Date();
  const [agencies, tasks, members] = await Promise.all([
    loadAgencies(supabase),
    openTasksOf(supabase, date, now),
    supabase
      .from("profiles")
      .select("id, full_name, transport_mode")
      .eq("role", "field")
      .order("full_name"),
  ]);
  const startMs = startOf(date, now);

  const routes: MemberRoute[] = (members.data ?? []).map((m) => {
    const stops = tasks
      .filter((t) => t.assigned_to === m.id)
      .map((t) => toStop(t, agencies.get(t.agency_id)));
    const plan = planRoute(stops, m.transport_mode, startMs);
    return { id: m.id, name: m.full_name, mode: m.transport_mode, plan, labels: labelsOf(plan) };
  });

  const usedAgencies = new Set(tasks.map((t) => t.agency_id));
  return {
    date,
    members: routes,
    unassigned: tasks
      .filter((t) => !t.assigned_to)
      .map((t) => ({
        id: t.id,
        documentRef: t.document_ref,
        agencyName: agencies.get(t.agency_id)?.name ?? "",
        due: formatClock(t.due_at),
      })),
    missingCoords: [...usedAgencies]
      .map((id) => agencies.get(id))
      .filter((a): a is AgencyGeo => !!a && (a.latitude === null || a.longitude === null))
      .map((a) => a.name),
  };
}

/** Ordem sugerida das visitas de hoje para o usuário de campo logado (RLS filtra). */
export async function loadMyRoute(
  mode: TransportMode,
): Promise<Record<string, { order: number; eta: string; travelMin: number; km: number; late: boolean }>> {
  const supabase = await createClient();
  const now = new Date();
  const today = todayInSaoPaulo(now);
  const [agencies, tasks] = await Promise.all([loadAgencies(supabase), openTasksOf(supabase, today, now)]);
  const plan = planRoute(
    tasks.map((t) => toStop(t, agencies.get(t.agency_id))),
    mode,
    startOf(today, now),
  );
  return Object.fromEntries(
    plan.stops.map((s) => [
      s.taskId,
      {
        order: s.order,
        eta: formatClock(new Date(s.etaMs).toISOString()),
        travelMin: s.travelMin,
        km: s.km,
        late: s.late,
      },
    ]),
  );
}

/** Sugestão de responsável para uma tarefa nova (formulário e assistente). */
export async function suggestForTask(input: {
  agencyId: string;
  dueAtIso: string;
}): Promise<AssigneeSuggestion | null> {
  const supabase = await createClient();
  const now = new Date();
  const date = toDateTimeLocal(input.dueAtIso).slice(0, 10);
  const [agencies, tasks, members] = await Promise.all([
    loadAgencies(supabase),
    openTasksOf(supabase, date, now),
    supabase.from("profiles").select("id, full_name, transport_mode").eq("role", "field"),
  ]);
  const agency = agencies.get(input.agencyId);
  if (!agency) return null;

  const memberDays: MemberDay[] = (members.data ?? []).map((m) => ({
    id: m.id,
    name: m.full_name,
    mode: m.transport_mode,
    stops: tasks
      .filter((t) => t.assigned_to === m.id)
      .map((t) => toStop(t, agencies.get(t.agency_id))),
  }));
  const candidate = toStop(
    { id: "nova", document_ref: "nova", agency_id: agency.id, due_at: input.dueAtIso },
    agency,
  );
  return suggestAssignee(memberDays, candidate, startOf(date, now));
}
