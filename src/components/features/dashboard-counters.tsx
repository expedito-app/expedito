import { RISK_STYLE } from "@/lib/risk";

type Counters = { overdue: number; atRisk: number; doneToday: number };

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="border-t border-line pt-4">
      <dt className="text-label font-medium uppercase text-muted">{label}</dt>
      <dd
        className={`mt-1 font-serif text-display font-semibold tabular-nums ${
          value > 0 ? tone : "text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

// Só ganham cor quando há algo a olhar; o rótulo sempre acompanha o número.
export function DashboardCounters({ counters }: { counters: Counters }) {
  return (
    <dl className="grid grid-cols-3 gap-6">
      <Counter
        label="Atrasadas"
        value={counters.overdue}
        tone={RISK_STYLE.overdue.text}
      />
      <Counter
        label="Em risco"
        value={counters.atRisk}
        tone={RISK_STYLE.at_risk.text}
      />
      <Counter label="Concluídas hoje" value={counters.doneToday} tone="text-ink" />
    </dl>
  );
}
