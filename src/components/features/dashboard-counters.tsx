import { RISK_STYLE } from "@/lib/risk";

type Counters = { overdue: number; atRisk: number; doneToday: number };

function Counter({
  label,
  value,
  chip,
  tone,
  icon,
}: {
  label: string;
  value: number;
  chip: string;
  tone: string;
  icon: string;
}) {
  return (
    <div className="card flex flex-col gap-6">
      <dt className="flex items-center gap-2 text-sm text-muted">
        <span
          aria-hidden
          className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold ${chip} ${tone}`}
        >
          {icon}
        </span>
        {label}
      </dt>
      <dd className={`text-metric font-light tabular-nums ${value > 0 ? tone : "text-ink"}`}>{value}</dd>
    </div>
  );
}

// Número grande e leve; o pastel só categoriza (o rótulo sempre acompanha).
export function DashboardCounters({ counters }: { counters: Counters }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      <Counter
        label="Atrasadas"
        value={counters.overdue}
        chip="bg-pastel-rose"
        tone={RISK_STYLE.overdue.text}
        icon={RISK_STYLE.overdue.icon}
      />
      <Counter
        label="Em risco"
        value={counters.atRisk}
        chip="bg-pastel-amber"
        tone={RISK_STYLE.at_risk.text}
        icon={RISK_STYLE.at_risk.icon}
      />
      <Counter
        label="Concluídas hoje"
        value={counters.doneToday}
        chip="bg-pastel-green"
        tone="text-ink"
        icon="✓"
      />
    </dl>
  );
}
