// Rótulos e estilos do risco. A REGRA fica só na view tasks_with_risk (SQL);
// aqui apenas refletimos o valor que o banco devolve (CLAUDE.md, seção 3.2).

export const RISK_LEVELS = ["overdue", "at_risk", "ok", "none"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_LABEL: Record<RiskLevel, string> = {
  overdue: "Atrasada",
  at_risk: "Em risco",
  ok: "No prazo",
  none: "",
};

// Cor nunca sozinha: sempre acompanhada de rótulo e ícone (seção 3.4).
export const RISK_STYLE: Record<RiskLevel, { text: string; soft: string; icon: string }> = {
  overdue: { text: "text-risk-overdue", soft: "bg-risk-overdue-soft", icon: "!" },
  at_risk: { text: "text-risk-at-risk", soft: "bg-risk-at-risk-soft", icon: "◷" },
  ok: { text: "text-risk-ok", soft: "bg-risk-ok-soft", icon: "✓" },
  none: { text: "text-muted", soft: "", icon: "" },
};

export function needsAttention(level: RiskLevel): boolean {
  return level === "overdue" || level === "at_risk";
}

/** Normaliza o texto vindo da view (coluna sem enum no Postgres). */
export function toRiskLevel(value: string | null): RiskLevel {
  return (RISK_LEVELS as readonly string[]).includes(value ?? "")
    ? (value as RiskLevel)
    : "none";
}
