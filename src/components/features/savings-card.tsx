import Link from "next/link";
import { brlShort, type Savings } from "@/lib/demurrage";

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

// Destaque principal do painel (preto): o valor que o sistema gera.
export function SavingsCard({ savings, monthLabel }: { savings: Savings; monthLabel: string }) {
  return (
    <Link
      href="/indicadores?periodo=12m"
      className="group flex flex-col justify-between gap-6 rounded-[2rem] bg-ink p-7 text-white transition-colors duration-150 hover:bg-ink/90"
    >
      <p className="text-sm text-white/60">Demurrage evitado em {monthLabel}</p>
      <div>
        <p className="text-metric font-light tabular-nums">{brlShort(savings.savedBrl)}</p>
        <p className="mt-2 text-sm text-white/60">
          {Math.round(savings.avoided)} atrasos evitados · atraso {pct(savings.currentRate)} (era{" "}
          {pct(savings.baselineRate)} antes do Expedito)
        </p>
      </div>
      <p className="text-xs text-white/50 underline-offset-4 group-hover:underline">Ver detalhes e premissas →</p>
    </Link>
  );
}
