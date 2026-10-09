import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AiInsights } from "@/components/features/ai-insights";
import { DemurrageSavings } from "@/components/features/demurrage-savings";
import {
  ChartLegend,
  HBar,
  Heatmap,
  TrendChart,
} from "@/components/features/insights-charts";
import { buttonBase, buttonVariants } from "@/components/ui/button";
import { PageFallback } from "@/components/ui/page-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { loadInsights, type Totals } from "@/lib/insights";
import { PERIOD_PRESETS, resolvePeriod, type Period } from "@/lib/period";

export const metadata: Metadata = { title: "Indicadores · Expedito" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function periodQuery(period: Period, extra?: Record<string, string>): string {
  const params = new URLSearchParams(
    period.preset ? { periodo: period.preset } : { de: period.fromDate, ate: period.toDate },
  );
  for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v);
  return params.toString();
}

const percent = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

function hours(v: number | null): string {
  if (v === null) return "—";
  if (v < 1) return `${Math.round(v * 60)} min`;
  if (v < 48) return `${v.toFixed(1).replace(".", ",")} h`;
  return `${(v / 24).toFixed(1).replace(".", ",")} dias`;
}


function Delta({ now, before, higherIsBetter, format }: {
  now: number | null;
  before: number | null;
  higherIsBetter: boolean;
  format: (n: number) => string;
}) {
  if (now === null || before === null || now === before) {
    return <p className="mt-1 text-sm text-muted">igual ao período anterior</p>;
  }
  const up = now > before;
  const good = up === higherIsBetter;
  return (
    <p className={`mt-1 text-sm ${good ? "text-risk-ok" : "text-risk-overdue"}`}>
      <span aria-hidden>{up ? "▲" : "▼"} </span>
      {format(Math.abs(now - before))} vs. período anterior
    </p>
  );
}

function Kpi({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="card">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-4 text-metric font-light tabular-nums">{value}</dd>
      {children}
    </div>
  );
}

function Kpis({ totals, previous }: { totals: Totals; previous: Totals }) {
  const late = totals.lateDone + totals.lateOpen;
  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <Kpi label="Tarefas" value={String(totals.total)}>
        <Delta now={totals.total} before={previous.total} higherIsBetter format={(n) => String(n)} />
      </Kpi>
      <Kpi label="Concluídas" value={String(totals.done)} />
      <Kpi label="Pontualidade" value={percent(totals.onTimeRate)}>
        <Delta
          now={totals.onTimeRate}
          before={previous.onTimeRate}
          higherIsBetter
          format={(n) => `${Math.round(n * 100)} p.p.`}
        />
      </Kpi>
      <Kpi label="Atrasaram" value={String(late)}>
        <p className="mt-1 text-sm text-muted">
          {totals.lateDone} concluídas tarde · {totals.lateOpen} ainda abertas
        </p>
      </Kpi>
      <Kpi label="Atraso médio" value={hours(totals.avgDelayHours)}>
        <p className="mt-1 text-sm text-muted">ciclo médio {hours(totals.avgCycleHours)}</p>
      </Kpi>
    </dl>
  );
}

function PeriodFilter({ period }: { period: Period }) {
  const presets = [...PERIOD_PRESETS.map((p) => ({ value: p.value, label: p.label })), { value: "ano", label: "Ano atual" }];
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <nav aria-label="Período" className="flex flex-wrap gap-1">
        {presets.map((p) => {
          const current = period.preset === p.value;
          return (
            <Link
              key={p.value}
              href={`/indicadores?periodo=${p.value}`}
              aria-current={current ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors duration-150 ${
                current ? "bg-ink text-paper" : "text-muted hover:text-ink"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </nav>
      <form action="/indicadores" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-label uppercase text-muted">
          De
          <input
            type="date"
            name="de"
            defaultValue={period.fromDate}
            className="h-10 rounded-full border border-line bg-surface px-2 text-sm normal-case text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-label uppercase text-muted">
          Até
          <input
            type="date"
            name="ate"
            defaultValue={period.toDate}
            className="h-10 rounded-full border border-line bg-surface px-2 text-sm normal-case text-ink"
          />
        </label>
        <button
          type="submit"
          className="h-10 rounded-full border border-line px-4 text-sm text-ink transition-colors duration-150 hover:bg-surface"
        >
          Aplicar
        </button>
      </form>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card mt-4">
      <h2 className="text-title font-medium">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

async function Insights({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const period = resolvePeriod(
    { periodo: first(raw.periodo), de: first(raw.de), ate: first(raw.ate) },
    new Date(),
  );
  const data = await loadInsights(period);
  const aiParams = period.preset
    ? { periodo: period.preset }
    : { de: period.fromDate, ate: period.toDate };
  const memberMax = Math.max(1, ...data.members.map((m) => m.total));
  const agencyMax = Math.max(1, ...data.agencies.map((a) => a.late + a.occurrences));
  const occurrenceMax = Math.max(1, ...data.occurrenceByType.map((o) => o.count));
  const forecastMax = Math.max(1, ...data.forecast.days.map((d) => d.count));

  return (
    <>
      <PeriodFilter period={period} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted">
          {period.label} · prazos dentro do período
          {data.busiest && ` · pico: ${data.busiest.label} (${data.busiest.count} tarefas)`}
        </p>
        <a
          href={`/indicadores/exportar?${periodQuery(period)}`}
          className={`${buttonBase} ${buttonVariants.ghost}`}
          download
        >
          Exportar planilha (CSV)
        </a>
      </div>

      <div className="mt-10">
        <Kpis totals={data.totals} previous={data.previous} />
      </div>

      <Section
        title="Demurrage evitado"
        hint="Quanto deixou de ser gasto com sobre-estadia porque as entregas saíram no prazo."
      >
        <DemurrageSavings {...data.demurrage} />
      </Section>

      <Section title="Análise da IA" hint="Gargalos, tendências e planos de ação a partir dos números do período.">
        <AiInsights params={aiParams} />
      </Section>

      <Section
        title="Entregas ao longo do tempo"
        hint={`Por ${data.granularity === "day" ? "dia" : data.granularity === "week" ? "semana" : "mês"}, pelo prazo da tarefa.`}
      >
        <ChartLegend />
        <div className="mt-4">
          {data.totals.total ? (
            <TrendChart buckets={data.series} />
          ) : (
            <p className="py-12 text-center text-muted">Nenhuma tarefa no período.</p>
          )}
        </div>
      </Section>

      <div className="grid gap-x-4 lg:grid-cols-2">
        <Section title="Equipe" hint="Tarefas no período, atrasos e média por dia trabalhado.">
          {data.members.length ? (
            <ul className="flex flex-col gap-5">
              {data.members.map((m) => (
                <li key={m.id ?? "none"}>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted">
                      {percent(m.onTimeRate)} no prazo · {m.late} atrasos ·{" "}
                      {m.perActiveDay.toFixed(1).replace(".", ",")}/dia
                    </span>
                  </div>
                  <div className="mt-2">
                    <HBar value={m.total} max={memberMax} label={`${m.total} tarefas`} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Sem dados.</p>
          )}
        </Section>

        <Section title="Agências que mais pedem atenção" hint="Atrasos e ocorrências no período.">
          {data.agencies.length ? (
            <ul className="flex flex-col gap-5">
              {data.agencies.slice(0, 6).map((a) => (
                <li key={a.id}>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="font-medium">{a.name}</span>
                    <span className="text-muted">
                      {a.late} atrasos · {a.byType.agency_closed} fechada · {a.byType.missing_document} faltou doc.
                    </span>
                  </div>
                  <div className="mt-2">
                    <HBar
                      value={a.late + a.occurrences}
                      max={agencyMax}
                      tone="bg-risk-overdue"
                      label={`${a.late} atrasos e ${a.occurrences} ocorrências em ${a.total} tarefas`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Sem dados.</p>
          )}
        </Section>
      </div>

      <div className="grid gap-x-4 lg:grid-cols-2">
        <Section title="Quando os prazos se concentram" hint="Dia da semana × hora do prazo. Ajuda a escalar a equipe.">
          <Heatmap {...data.heatmap} />
        </Section>

        <Section title="Ocorrências por tipo" hint={`${data.totals.occurrences} no período.`}>
          <ul className="flex flex-col gap-4">
            {data.occurrenceByType.map((o) => (
              <li key={o.type}>
                <p className="text-sm font-medium">{o.label}</p>
                <div className="mt-2">
                  <HBar value={o.count} max={occurrenceMax} tone="bg-risk-at-risk" />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section
        title="Próximos 7 dias"
        hint={`Tarefas abertas já cadastradas. Normal do período: ${data.forecast.normalDaily
          .toFixed(1)
          .replace(".", ",")} por dia com tarefa · equipe de ${data.forecast.teamSize}.`}
      >
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-7">
          {data.forecast.days.map((d) => (
            <li key={d.date} className="border-t border-line pt-3">
              <p className="text-label uppercase text-muted">{d.label}</p>
              <p className={`mt-1 text-title tabular-nums ${d.aboveNormal ? "text-risk-at-risk" : ""}`}>
                {d.count}
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-line/60">
                <div
                  className={`h-1.5 rounded-full ${d.aboveNormal ? "bg-risk-at-risk" : "bg-accent"}`}
                  style={{ width: `${Math.round((d.count / forecastMax) * 100)}%` }}
                />
              </div>
              {d.aboveNormal && (
                <p className="mt-1 text-xs text-risk-at-risk">
                  <span aria-hidden>◷ </span>acima do normal
                </p>
              )}
            </li>
          ))}
        </ul>
      </Section>

    </>
  );
}

export default function IndicadoresPage({ searchParams }: PageProps<"/indicadores">) {
  return (
    <>
      <PageHeader eyebrow="Gestão" title="Indicadores" />
      <div className="mt-10">
        <Suspense fallback={<PageFallback />}>
          <Insights searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
