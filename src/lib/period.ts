import { z } from "zod";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";

// Período dos indicadores, lido da URL (?periodo=30d ou ?de=AAAA-MM-DD&ate=AAAA-MM-DD).
// Datas no fuso de São Paulo; "ate" é inclusivo na tela e exclusivo na consulta.

export const PERIOD_PRESETS = [
  { value: "7d", label: "7 dias", days: 7 },
  { value: "30d", label: "30 dias", days: 30 },
  { value: "90d", label: "90 dias", days: 90 },
  { value: "12m", label: "12 meses", days: 365 },
] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number]["value"];

export type Period = {
  /** Início (ISO UTC, inclusivo). */
  start: string;
  /** Fim (ISO UTC, exclusivo). */
  end: string;
  /** AAAA-MM-DD, para os campos de data. */
  fromDate: string;
  toDate: string;
  days: number;
  preset: PeriodPreset | "ano" | null;
  label: string;
};

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const pad = (n: number) => String(n).padStart(2, "0");

/** Soma dias a uma data AAAA-MM-DD (aritmética de calendário, sem fuso). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function diffDays(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Hoje (AAAA-MM-DD) em São Paulo. */
export function todayInSaoPaulo(now: Date): string {
  return toDateTimeLocal(now.toISOString()).slice(0, 10);
}

function formatShortDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function build(
  fromDate: string,
  toDate: string,
  preset: Period["preset"],
  label: string,
): Period {
  return {
    start: fromDateTimeLocal(`${fromDate}T00:00`),
    end: fromDateTimeLocal(`${addDays(toDate, 1)}T00:00`),
    fromDate,
    toDate,
    days: diffDays(fromDate, toDate) + 1,
    preset,
    label,
  };
}

export function resolvePeriod(
  params: Record<string, string | string[] | undefined>,
  now: Date,
): Period {
  const today = todayInSaoPaulo(now);
  const from = dateSchema.safeParse(params.de);
  const to = dateSchema.safeParse(params.ate);

  if (from.success && to.success && from.data <= to.data) {
    // Limite de 3 anos para a consulta não pesar.
    const fromDate = diffDays(from.data, to.data) > 1095 ? addDays(to.data, -1095) : from.data;
    return build(
      fromDate,
      to.data,
      null,
      `${formatShortDate(fromDate)} a ${formatShortDate(to.data)}`,
    );
  }

  if (params.periodo === "ano") {
    return build(`${today.slice(0, 4)}-01-01`, today, "ano", `Ano de ${today.slice(0, 4)}`);
  }

  const preset =
    PERIOD_PRESETS.find((p) => p.value === params.periodo) ?? PERIOD_PRESETS[1];
  return build(
    addDays(today, -(preset.days - 1)),
    today,
    preset.value,
    `Últimos ${preset.label}`,
  );
}

/** Mesma duração, imediatamente antes (para comparar com o período anterior). */
export function previousPeriod(period: Period): Period {
  const toDate = addDays(period.fromDate, -1);
  const fromDate = addDays(toDate, -(period.days - 1));
  return build(fromDate, toDate, null, "Período anterior");
}
