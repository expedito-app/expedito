import { RISK_LABEL, RISK_STYLE, type RiskLevel } from "@/lib/risk";

export function RiskBadge({ level }: { level: RiskLevel }) {
  if (level === "none") return null;
  const style = RISK_STYLE[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${style.text} ${style.soft}`}
    >
      <span aria-hidden className="font-semibold">
        {style.icon}
      </span>
      {RISK_LABEL[level]}
    </span>
  );
}
