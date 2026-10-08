import type { Bucket, HeatCell } from "@/lib/insights";
import { WEEKDAY_LABEL } from "@/lib/insights";

// Gráficos em SVG puro (sem dependência nova). Cores: destaque para "no prazo",
// vermelho de risco para "atrasou" e neutro para "em aberto"; sempre com legenda,
// dica ao passar o mouse (<title>) e tabela equivalente para leitores de tela.

const SERIES = [
  { key: "onTime", label: "No prazo", className: "fill-accent", swatch: "bg-accent" },
  { key: "late", label: "Atrasou", className: "fill-risk-overdue", swatch: "bg-risk-overdue" },
  { key: "open", label: "Em aberto", className: "fill-muted/40", swatch: "bg-muted/40" },
] as const;

export function ChartLegend() {
  return (
    <ul className="flex flex-wrap gap-4 text-sm text-muted">
      {SERIES.map((s) => (
        <li key={s.key} className="flex items-center gap-2">
          <span aria-hidden className={`inline-block size-2.5 rounded-sm ${s.swatch}`} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

export function TrendChart({ buckets }: { buckets: Bucket[] }) {
  const width = 720;
  const height = 220;
  const pad = { top: 8, right: 8, bottom: 28, left: 32 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...buckets.map((b) => b.onTime + b.late + b.open));
  const niceMax = Math.max(4, Math.ceil(max / 4) * 4);
  const slot = plotW / Math.max(1, buckets.length);
  const barW = Math.max(2, Math.min(28, slot - 2));
  const labelEvery = Math.ceil(buckets.length / 12);
  const ticks = [0, niceMax / 2, niceMax];

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Tarefas por período: no prazo, atrasadas e em aberto"
      >
        {ticks.map((t) => {
          const y = pad.top + plotH - (t / niceMax) * plotH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} className="stroke-line" strokeWidth={1} />
              <text x={pad.left - 6} y={y + 4} textAnchor="end" className="fill-muted text-[10px] tabular-nums">
                {t}
              </text>
            </g>
          );
        })}
        {buckets.map((b, i) => {
          const x = pad.left + i * slot + (slot - barW) / 2;
          let y = pad.top + plotH;
          const total = b.onTime + b.late + b.open;
          return (
            <g key={b.key}>
              <title>{`${b.label}: ${total} tarefas · ${b.onTime} no prazo · ${b.late} atrasaram · ${b.open} em aberto`}</title>
              {/* área de toque maior que a barra */}
              <rect x={pad.left + i * slot} y={pad.top} width={slot} height={plotH} className="fill-transparent" />
              {SERIES.map((s) => {
                const value = b[s.key];
                if (!value) return null;
                const h = (value / niceMax) * plotH;
                y -= h;
                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(0, h - 1)}
                    rx={Math.min(2, barW / 4)}
                    className={s.className}
                  />
                );
              })}
              {i % labelEvery === 0 && (
                <text
                  x={pad.left + i * slot + slot / 2}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-muted text-[10px]"
                >
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="mt-2 text-sm text-muted">
        <summary className="cursor-pointer">Ver em tabela</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead>
            <tr className="border-b border-line">
              <th className="py-1 pr-4 font-medium">Período</th>
              <th className="py-1 pr-4 font-medium">No prazo</th>
              <th className="py-1 pr-4 font-medium">Atrasou</th>
              <th className="py-1 font-medium">Em aberto</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.key} className="border-b border-line/60">
                <td className="py-1 pr-4">{b.label}</td>
                <td className="py-1 pr-4">{b.onTime}</td>
                <td className="py-1 pr-4">{b.late}</td>
                <td className="py-1">{b.open}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Barra horizontal simples (uma série), com o número ao lado. */
export function HBar({
  value,
  max,
  tone = "bg-accent",
  label,
}: {
  value: number;
  max: number;
  tone?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3" title={label}>
      <div className="h-2 flex-1 rounded-full bg-line/60">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-sm tabular-nums">{value}</span>
    </div>
  );
}

export function Heatmap({
  cells,
  hours,
  max,
}: {
  cells: HeatCell[];
  hours: number[];
  max: number;
}) {
  const weekdays = [1, 2, 3, 4, 5, 6, 0];
  const byKey = new Map(cells.map((c) => [`${c.weekday}-${c.hour}`, c.count]));
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-0.5 text-[11px] text-muted">
        <thead>
          <tr>
            <th className="sr-only">Dia</th>
            {hours.map((h) => (
              <th key={h} scope="col" className="px-0.5 font-normal tabular-nums">
                {String(h).padStart(2, "0")}h
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weekdays.map((w) => (
            <tr key={w}>
              <th scope="row" className="pr-2 text-left font-normal">
                {WEEKDAY_LABEL[w]}
              </th>
              {hours.map((h) => {
                const count = byKey.get(`${w}-${h}`) ?? 0;
                const intensity = max ? count / max : 0;
                return (
                  <td
                    key={h}
                    title={`${WEEKDAY_LABEL[w]}, ${h}h: ${count} prazos`}
                    className="size-7 rounded-sm text-center tabular-nums"
                    style={{
                      backgroundColor:
                        count === 0
                          ? "var(--color-line)"
                          : `color-mix(in srgb, var(--color-accent) ${Math.round(15 + intensity * 85)}%, var(--color-surface))`,
                      color: intensity > 0.55 ? "var(--color-accent-ink)" : "var(--color-ink)",
                    }}
                  >
                    {count || ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
