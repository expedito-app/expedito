import type { NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { STATUS_LABEL, URGENCY_LABEL, formatFullDateTime } from "@/lib/format";
import { OUTCOME_LABEL, loadInsights } from "@/lib/insights";
import { costPerDelay } from "@/lib/demurrage";
import { resolvePeriod } from "@/lib/period";

// Exporta as tarefas do período em CSV (abre no Google Sheets e no Excel).
// Separador ";" e BOM UTF-8 para o Excel em português reconhecer acentos e colunas.

function cell(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  // Evita injeção de fórmula ao abrir a planilha (=, +, -, @ no início).
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const decimal = (n: number | null) => (n === null ? null : n.toFixed(1).replace(".", ","));

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "manager") {
    return new Response("Apenas gestores podem exportar.", { status: 403 });
  }

  const search = request.nextUrl.searchParams;
  const period = resolvePeriod(
    {
      periodo: search.get("periodo") ?? undefined,
      de: search.get("de") ?? undefined,
      ate: search.get("ate") ?? undefined,
    },
    new Date(),
  );
  const data = await loadInsights(period);

  const header = [
    "Documento",
    "Agência",
    "Responsável",
    "Urgência",
    "Status",
    "Prazo",
    "Concluída em",
    "Resultado",
    "Atraso (h)",
    "Demurrage estimado (R$)",
  ];
  const unitCost = costPerDelay(data.demurrage.settings);
  const lines = data.rows.map((r) =>
    [
      r.documentRef,
      r.agency,
      r.member,
      URGENCY_LABEL[r.urgency],
      STATUS_LABEL[r.status],
      formatFullDateTime(r.dueAt),
      r.completedAt ? formatFullDateTime(r.completedAt) : null,
      OUTCOME_LABEL[r.outcome],
      decimal(r.delayHours),
      r.delayHours !== null ? unitCost.toFixed(2).replace(".", ",") : null,
    ]
      .map(cell)
      .join(";"),
  );
  const csv = `\uFEFF${[header.join(";"), ...lines].join("\r\n")}\r\n`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expedito-${period.fromDate}-a-${period.toDate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
