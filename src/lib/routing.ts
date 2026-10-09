import { TRANSPORT_PROFILE, type TransportMode } from "@/lib/transport";

// Roteirização sem mapas nem trânsito (fora do escopo): distância em linha reta
// entre as agências × fator de ruas, velocidade média por meio de transporte e
// tempo de atendimento fixo. Funções puras, testáveis e usadas no servidor.

export type Point = { lat: number; lng: number };

export type RouteStop = {
  taskId: string;
  documentRef: string;
  agencyId: string;
  agencyName: string;
  point: Point | null;
  /** Prazo efetivo (ms): o menor entre o prazo da tarefa e o fechamento da agência no dia. */
  deadlineMs: number;
  dueAt: string;
};

export type PlannedStop = RouteStop & {
  order: number;
  etaMs: number;
  travelMin: number;
  km: number;
  late: boolean;
};

export type RoutePlan = {
  stops: PlannedStop[];
  totalKm: number;
  totalMin: number;
  lateCount: number;
  unlocated: number;
};

/** Ruas não são linha reta: fator típico de cidade. */
const ROAD_FACTOR = 1.35;
/** Tempo no balcão da agência por visita. */
export const SERVICE_MIN = 15;
/** Prazo apertado: visita entra antes das mais próximas. */
const URGENT_SLACK_MIN = 30;

export function distanceKm(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h))) * ROAD_FACTOR;
}

export function travelMinutes(km: number, mode: TransportMode): number {
  if (km < 0.05) return 0; // mesma agência / mesmo prédio
  const profile = TRANSPORT_PROFILE[mode];
  return (km / profile.kmh) * 60 + profile.stopOverheadMin;
}

/** Sem coordenada conhecida: estimativa média de deslocamento no centro. */
const UNKNOWN_TRAVEL_KM = 2.5;

function leg(from: Point | null, to: Point | null, first: boolean): number {
  if (first && !from) return 0;
  if (!from || !to) return UNKNOWN_TRAVEL_KM;
  return distanceKm(from, to);
}

/**
 * Ordena as visitas: a cada passo, se alguma tem prazo apertado (folga < 30 min),
 * vai nela; senão escolhe a de menor custo = deslocamento + peso pequeno para a
 * folga (perto e com prazo mais cedo primeiro). Visitas na mesma agência saem
 * juntas porque o deslocamento é zero.
 */
export function planRoute(
  stops: RouteStop[],
  mode: TransportMode,
  startMs: number,
  startPoint: Point | null = null,
): RoutePlan {
  const remaining = [...stops];
  const planned: PlannedStop[] = [];
  let clock = startMs;
  let here = startPoint;
  let totalKm = 0;

  while (remaining.length) {
    const first = planned.length === 0;
    const options = remaining.map((stop, index) => {
      const km = leg(here, stop.point, first);
      const travel = first && !here ? 0 : travelMinutes(km, mode);
      const arrival = clock + travel * 60_000;
      const slackMin = (stop.deadlineMs - arrival) / 60_000;
      return { index, km, travel, arrival, slackMin, cost: travel + Math.max(0, slackMin) * 0.05 };
    });
    const urgent = options
      .filter((o) => o.slackMin >= 0 && o.slackMin < URGENT_SLACK_MIN)
      .sort((a, b) => a.slackMin - b.slackMin)[0];
    const best = urgent ?? options.sort((a, b) => a.cost - b.cost)[0];

    const [stop] = remaining.splice(best.index, 1);
    planned.push({
      ...stop,
      order: planned.length + 1,
      etaMs: best.arrival,
      travelMin: Math.round(best.travel),
      km: Math.round(best.km * 10) / 10,
      late: best.arrival > stop.deadlineMs,
    });
    totalKm += best.km;
    clock = best.arrival + SERVICE_MIN * 60_000;
    here = stop.point ?? here;
  }

  return {
    stops: planned,
    totalKm: Math.round(totalKm * 10) / 10,
    totalMin: Math.round((clock - startMs) / 60_000),
    lateCount: planned.filter((s) => s.late).length,
    unlocated: planned.filter((s) => !s.point).length,
  };
}

export type MemberDay = {
  id: string;
  name: string;
  mode: TransportMode;
  stops: RouteStop[];
};

export type AssigneeSuggestion = {
  memberId: string;
  memberName: string;
  reason: string;
  ranking: { memberId: string; name: string; extraMin: number; late: number; load: number }[];
};

const fmtKm = (km: number) => `${km.toFixed(1).replace(".", ",")} km`;

/**
 * Quem deve pegar a nova visita: compara a rota do dia de cada pessoa com e sem
 * a tarefa nova. Custo = minutos a mais na rota + 60 por visita que passa a
 * atrasar + 8 por tarefa já no dia (equilíbrio de carga).
 */
export function suggestAssignee(
  members: MemberDay[],
  candidate: RouteStop,
  startMs: number,
  startPoint: Point | null = null,
): AssigneeSuggestion | null {
  if (!members.length) return null;
  const ranking = members.map((m) => {
    const before = planRoute(m.stops, m.mode, startMs, startPoint);
    const after = planRoute([...m.stops, candidate], m.mode, startMs, startPoint);
    const extraMin = Math.max(0, after.totalMin - before.totalMin);
    const late = Math.max(0, after.lateCount - before.lateCount);
    const load = m.stops.length;
    return { member: m, extraMin, late, load, cost: extraMin + late * 60 + load * 8 };
  });
  ranking.sort((a, b) => a.cost - b.cost);
  const best = ranking[0];

  // Motivo legível: a visita do dia mais próxima da nova agência.
  let nearest: { name: string; km: number; due: string } | null = null;
  if (candidate.point) {
    for (const s of best.member.stops) {
      if (!s.point) continue;
      const km = distanceKm(candidate.point, s.point);
      if (!nearest || km < nearest.km) nearest = { name: s.agencyName, km, due: s.dueAt };
    }
  }
  const parts: string[] = [];
  if (nearest) {
    parts.push(
      nearest.km < 0.05
        ? `já tem visita na ${nearest.name} no mesmo dia`
        : `já passa na ${nearest.name}, a ${fmtKm(nearest.km)}`,
    );
  }
  parts.push(
    best.load === 0
      ? "está sem visitas no dia"
      : `${best.load} ${best.load === 1 ? "visita" : "visitas"} no dia`,
  );
  parts.push(`+${best.extraMin} min na rota`);
  if (best.late) parts.push(`atenção: ${best.late} visita pode atrasar`);

  return {
    memberId: best.member.id,
    memberName: best.member.name,
    reason: parts.join(" · "),
    ranking: ranking.map((r) => ({
      memberId: r.member.id,
      name: r.member.name,
      extraMin: r.extraMin,
      late: r.late,
      load: r.load,
    })),
  };
}
