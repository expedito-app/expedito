"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadAlerts, type Alert } from "@/actions/alerts";
import { RISK_STYLE } from "@/lib/risk";

// Pop-ups de alerta (dentro do app, sem notificação push). Consulta o servidor
// a cada minuto com a aba visível. Um aviso dispensado não volta no mesmo dia,
// a não ser que a situação piore (o id muda: "em risco" → "atrasada").

const INTERVAL_MS = 60_000;
const MAX_VISIBLE = 3;
const STORAGE_KEY = "expedito:alertas";

type Stored = { day: string; dismissed: string[]; since?: string };

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

function readStored(): Stored {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (
      parsed &&
      typeof parsed === "object" &&
      "day" in parsed &&
      parsed.day === today() &&
      "dismissed" in parsed &&
      Array.isArray(parsed.dismissed)
    ) {
      const since = "since" in parsed && typeof parsed.since === "string" ? parsed.since : undefined;
      return {
        day: today(),
        dismissed: parsed.dismissed.filter((d): d is string => typeof d === "string"),
        since,
      };
    }
  } catch {
    // Armazenamento indisponível (janela privada etc.): segue só em memória.
  }
  return { day: today(), dismissed: [] };
}

function writeStored(value: Stored) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // idem
  }
}

const TONE: Record<Alert["tone"], { border: string; icon: string; text: string }> = {
  overdue: { border: "border-l-risk-overdue", icon: RISK_STYLE.overdue.icon, text: RISK_STYLE.overdue.text },
  at_risk: { border: "border-l-risk-at-risk", icon: RISK_STYLE.at_risk.icon, text: RISK_STYLE.at_risk.text },
  info: { border: "border-l-accent", icon: "i", text: "text-accent" },
};

// No campo os avisos ficam no topo: embaixo estão os botões do polegar.
export function AlertCenter({ placement = "bottom" }: { placement?: "bottom" | "top" }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const stored = useRef<Stored | null>(null);

  const fetchAlerts = useCallback(async () => {
    stored.current ??= readStored();
    const state = stored.current;
    if (state.day !== today()) {
      state.day = today();
      state.dismissed = [];
    }
    const startedAt = new Date().toISOString();
    try {
      const fresh = await loadAlerts(state.since);
      setAlerts((current) => {
        // Ocorrências antigas continuam até serem dispensadas.
        const occurrences = current.filter(
          (a) => a.id.startsWith("occurrence:") && !fresh.some((f) => f.id === a.id),
        );
        return [...fresh, ...occurrences].filter((a) => !state.dismissed.includes(a.id));
      });
      state.since = startedAt;
      writeStored(state);
    } catch {
      // Falha de rede: tenta de novo no próximo ciclo.
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(fetchAlerts, 1500);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchAlerts();
    }, INTERVAL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [fetchAlerts]);

  const dismiss = (ids: string[]) => {
    const state = (stored.current ??= readStored());
    state.dismissed = [...new Set([...state.dismissed, ...ids])];
    writeStored(state);
    setAlerts((current) => current.filter((a) => !ids.includes(a.id)));
  };

  const visible = alerts.slice(0, MAX_VISIBLE);
  const hidden = alerts.length - visible.length;

  return (
    <div
      aria-live="polite"
      aria-label="Alertas"
      className={`pointer-events-none fixed inset-x-4 z-40 flex flex-col items-end gap-2 sm:left-auto sm:w-96 ${
        placement === "top" ? "top-16" : "bottom-4"
      }`}
    >
      <AnimatePresence initial={false}>
        {visible.map((alert) => {
          const tone = TONE[alert.tone];
          return (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              role="status"
              className={`pointer-events-auto w-full rounded-md border border-l-4 border-line bg-surface p-4 ${tone.border}`}
            >
              <div className="flex items-start gap-3">
                <span aria-hidden className={`mt-0.5 font-semibold ${tone.text}`}>
                  {tone.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={alert.href}
                    onClick={() => dismiss([alert.id])}
                    className="font-medium text-ink underline-offset-4 hover:underline"
                  >
                    {alert.title}
                  </Link>
                  <p className="mt-0.5 truncate text-sm text-muted">{alert.detail}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss([alert.id])}
                  aria-label={`Dispensar: ${alert.title}`}
                  className="-m-2 flex size-10 items-center justify-center rounded-md text-muted hover:text-ink"
                >
                  ×
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {hidden > 0 && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-2 text-sm">
          <span className="text-muted">
            + {hidden} {hidden === 1 ? "alerta" : "alertas"}
          </span>
          <button
            type="button"
            onClick={() => dismiss(alerts.map((a) => a.id))}
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Dispensar todos
          </button>
        </div>
      )}
    </div>
  );
}
