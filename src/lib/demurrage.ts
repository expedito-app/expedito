// "Demurrage evitado": estimativa transparente, com premissas do gestor.
//
//   atrasos evitados = tarefas com desfecho × (taxa de atraso antes − taxa atual)
//   custo por atraso = dias de demurrage por atraso × contêineres por BL × diária
//   economia         = atrasos evitados × custo por atraso
//
// "Tarefas com desfecho" = concluídas + vencidas ainda abertas (as que já
// podiam ter atrasado). Nunca negativa: se a taxa atual passar da de antes,
// a economia é zero e o custo dos atrasos aparece à parte.

export type DemurrageSettings = {
  dailyBrl: number;
  containersPerBl: number;
  daysPerDelay: number;
  /** 0 a 1 */
  baselineLateRate: number;
};

export const DEFAULT_DEMURRAGE: DemurrageSettings = {
  dailyBrl: 500,
  containersPerBl: 2,
  daysPerDelay: 1,
  baselineLateRate: 0.25,
};

export type Savings = {
  /** Tarefas que já tiveram desfecho (base do cálculo). */
  base: number;
  late: number;
  currentRate: number | null;
  baselineRate: number;
  avoided: number;
  costPerDelay: number;
  savedBrl: number;
  lostBrl: number;
};

export function costPerDelay(s: DemurrageSettings): number {
  return s.daysPerDelay * s.containersPerBl * s.dailyBrl;
}

export function computeSavings(onTime: number, late: number, s: DemurrageSettings): Savings {
  const base = onTime + late;
  const avoided = Math.max(0, base * s.baselineLateRate - late);
  const unit = costPerDelay(s);
  return {
    base,
    late,
    currentRate: base ? late / base : null,
    baselineRate: s.baselineLateRate,
    avoided,
    costPerDelay: unit,
    savedBrl: avoided * unit,
    lostBrl: late * unit,
  };
}

/** Lê as premissas do perfil (colunas numeric podem chegar como texto). */
export function settingsFromProfile(profile: {
  demurrage_daily_brl?: number | string | null;
  containers_per_bl?: number | string | null;
  demurrage_days_per_delay?: number | string | null;
  baseline_late_rate?: number | string | null;
} | null): DemurrageSettings {
  const num = (v: number | string | null | undefined, fallback: number) => {
    const n = Number(v);
    return v === null || v === undefined || !Number.isFinite(n) ? fallback : n;
  };
  return {
    dailyBrl: num(profile?.demurrage_daily_brl, DEFAULT_DEMURRAGE.dailyBrl),
    containersPerBl: num(profile?.containers_per_bl, DEFAULT_DEMURRAGE.containersPerBl),
    daysPerDelay: num(profile?.demurrage_days_per_delay, DEFAULT_DEMURRAGE.daysPerDelay),
    baselineLateRate: num(profile?.baseline_late_rate, DEFAULT_DEMURRAGE.baselineLateRate),
  };
}

export const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** "R$ 48 mil" / "R$ 1,2 mi" para números grandes no painel. */
export function brlShort(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (value >= 10_000) return `R$ ${Math.round(value / 1000)} mil`;
  return brl.format(value);
}
