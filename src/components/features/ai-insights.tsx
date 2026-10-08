"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { generateInsights, type Insight } from "@/actions/insights";
import { Button } from "@/components/ui/button";

const KIND_LABEL: Record<Insight["kind"], { label: string; icon: string; tone: string }> = {
  alert: { label: "Alerta", icon: "!", tone: "text-risk-overdue" },
  trend: { label: "Tendência", icon: "↗", tone: "text-accent" },
  action: { label: "Plano de ação", icon: "→", tone: "text-risk-ok" },
};

type Params = { periodo?: string; de?: string; ate?: string };

export function AiInsights({ params }: { params: Params }) {
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      setError(null);
      const reply = await generateInsights(params);
      if (reply.ok) setInsights(reply.insights);
      else setError(reply.error);
    });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" onClick={run} disabled={pending}>
          {pending ? "Analisando…" : insights ? "Gerar de novo" : "Gerar análise com IA"}
        </Button>
        <p className="text-sm text-muted">
          A IA recebe só os números agregados do período (sem BLs nem descrições).
        </p>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-risk-overdue">
          {error}
        </p>
      )}
      <AnimatePresence>
        {insights && (
          <motion.ul
            key={insights.map((i) => i.title).join("|")}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-6 grid gap-4 md:grid-cols-2"
            aria-live="polite"
          >
            {insights.map((insight) => {
              const kind = KIND_LABEL[insight.kind];
              return (
                <li key={insight.title} className="rounded-md border border-line bg-surface p-5">
                  <p className={`text-label font-medium uppercase ${kind.tone}`}>
                    <span aria-hidden className="mr-1.5 font-semibold">
                      {kind.icon}
                    </span>
                    {kind.label}
                  </p>
                  <p className="mt-2 font-medium">{insight.title}</p>
                  <p className="mt-1 text-sm text-muted">{insight.detail}</p>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
