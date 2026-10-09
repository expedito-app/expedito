import Link from "next/link";
import { brl, brlShort, type DemurrageSettings, type Savings } from "@/lib/demurrage";

type SeriesPoint = { key: string; label: string; savedBrl: number; lostBrl: number; cumulativeBrl: number };

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** Barras do demurrage evitado (verde pastel) e do ainda perdido (rosa) por período. */
function SavingsBars({ series }: { series: SeriesPoint[] }) {
  const max = Math.max(1, ...series.map((p) => Math.max(p.savedBrl, p.lostBrl)));
  const labelEvery = Math.ceil(series.length / 12);
  return (
    <figure>
      <div className="flex h-40 items-end gap-1" role="img" aria-label="Demurrage evitado e perdido por período">
        {series.map((p, i) => (
          <div key={p.key} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-0.5">
            <div
              title={`${p.label}: ${brl.format(p.savedBrl)} evitados · ${brl.format(p.lostBrl)} perdidos`}
              className="flex flex-1 flex-col justify-end gap-0.5"
            >
              <div className="rounded-t-md bg-pastel-green" style={{ height: `${(p.savedBrl / max) * 100}%` }} />
              {p.lostBrl > 0 && (
                <div className="rounded-b-md bg-pastel-rose" style={{ height: `${(p.lostBrl / max) * 100}%` }} />
              )}
            </div>
            <span className="h-4 truncate text-center text-[10px] text-muted">
              {i % labelEvery === 0 ? p.label : ""}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
        <span className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 rounded-sm bg-pastel-green" /> Evitado
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="size-2.5 rounded-sm bg-pastel-rose" /> Ainda perdido com atrasos
        </span>
      </figcaption>
    </figure>
  );
}

export function DemurrageSavings({
  period,
  previous,
  series,
  settings,
}: {
  period: Savings;
  previous: Savings;
  series: SeriesPoint[];
  settings: DemurrageSettings;
}) {
  const delta = period.savedBrl - previous.savedBrl;
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-pastel-green p-6">
          <p className="text-sm text-ink/70">Demurrage evitado no período</p>
          <p className="mt-4 text-metric font-light tabular-nums">{brlShort(period.savedBrl)}</p>
          <p className="mt-2 text-sm text-ink/70">
            {num(period.avoided)} atrasos evitados
            {previous.base > 0 &&
              ` · ${delta >= 0 ? "+" : "−"}${brlShort(Math.abs(delta))} vs. período anterior`}
          </p>
        </div>
        <div className="rounded-3xl border border-line p-6">
          <p className="text-sm text-muted">Taxa de atraso</p>
          <p className="mt-4 text-metric font-light tabular-nums">{pct(period.currentRate)}</p>
          <p className="mt-2 text-sm text-muted">
            antes do Expedito: {pct(settings.baselineLateRate)} · {period.late} de {period.base} atrasaram
          </p>
        </div>
        <div className="rounded-3xl border border-line p-6">
          <p className="text-sm text-muted">Ainda perdido com atrasos</p>
          <p className="mt-4 text-metric font-light tabular-nums">{brlShort(period.lostBrl)}</p>
          <p className="mt-2 text-sm text-muted">{period.late} atrasos × {brl.format(period.costPerDelay)}</p>
        </div>
      </div>

      {series.length > 1 && <SavingsBars series={series} />}

      <details className="rounded-3xl bg-canvas p-5 text-sm">
        <summary className="cursor-pointer font-medium">Como calculamos</summary>
        <div className="mt-3 flex flex-col gap-2 text-muted">
          <p>
            <strong className="text-ink">Atrasos evitados</strong> = tarefas com desfecho no período ({period.base}) ×
            taxa de atraso antes do Expedito ({pct(settings.baselineLateRate)}) − atrasos que ainda aconteceram (
            {period.late}).
          </p>
          <p>
            <strong className="text-ink">Custo de cada atraso</strong> = {num(settings.daysPerDelay)}{" "}
            {settings.daysPerDelay === 1 ? "dia" : "dias"} de demurrage × {num(settings.containersPerBl)} contêineres
            por BL × {brl.format(settings.dailyBrl)} por dia = {brl.format(period.costPerDelay)}.
          </p>
          <p>
            É uma <strong className="text-ink">estimativa</strong>: um atraso na retirada do BL consome dias do free
            time (5 a 7 dias, em geral) e pode virar sobre-estadia. Diárias de mercado vão de ~US$ 75 (dry 20&apos;) a
            ~US$ 460 (reefer).{" "}
            <Link href="/empresa" className="font-medium text-ink underline underline-offset-4">
              Ajustar premissas
            </Link>
          </p>
        </div>
      </details>
    </div>
  );
}
