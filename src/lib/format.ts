import type { Enums } from "@/types/database";

// Rótulos de interface (CLAUDE.md, seção 3.3).
export const STATUS_LABEL: Record<Enums<"task_status">, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  done: "Concluída",
  problem: "Com problema",
};

export const URGENCY_LABEL: Record<Enums<"task_urgency">, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export const OCCURRENCE_LABEL: Record<Enums<"occurrence_type">, string> = {
  agency_closed: "Agência fechada",
  missing_document: "Faltou documento",
  other: "Outro",
};

export const TIME_ZONE = "America/Sao_Paulo";

const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const partsFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "07/10, 14:30" no fuso de São Paulo. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** "08:00:00" (coluna time) → "08:00". */
export function formatTime(time: string | null): string {
  return time ? time.slice(0, 5) : "";
}

/** "08:00" – "17:00", ou texto vazio se não houver horário. */
export function formatOpeningHours(
  opensAt: string | null,
  closesAt: string | null,
): string {
  if (!opensAt && !closesAt) return "";
  return `${formatTime(opensAt) || "?"} – ${formatTime(closesAt) || "?"}`;
}

function zonedParts(epochMs: number) {
  const parts = Object.fromEntries(
    partsFormat
      .formatToParts(new Date(epochMs))
      .map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO (UTC) → valor de <input type="datetime-local"> em São Paulo. */
export function toDateTimeLocal(iso: string): string {
  const p = zonedParts(new Date(iso).getTime());
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Valor de <input type="datetime-local"> lido em São Paulo → ISO (UTC). */
export function fromDateTimeLocal(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Data inválida: ${value}`);
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  // Diferença entre o relógio de São Paulo e o UTC nesse instante.
  const p = zonedParts(asUtc);
  const offset =
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - asUtc;
  return new Date(asUtc - offset).toISOString();
}
