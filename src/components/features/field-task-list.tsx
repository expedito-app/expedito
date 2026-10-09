"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { updateTaskStatus } from "@/actions/field";
import { CompletionForm } from "@/components/features/completion-form";
import { OccurrenceForm } from "@/components/features/occurrence-form";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/ui/risk-badge";
import { Sheet } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import type { FieldTask } from "@/lib/field";
import { URGENCY_LABEL } from "@/lib/format";
import { needsAttention } from "@/lib/risk";
import type { Enums } from "@/types/database";

const EASE = [0.22, 1, 0.36, 1] as const;
const TOAST_MS = 6000;

type Status = Enums<"task_status">;
type Toast = { message: string; undo?: { taskId: string; status: Status } };
type SheetState = { kind: "occurrence" | "complete"; task: FieldTask } | null;

// Próximo passo do fluxo: um toque por mudança de status.
function primaryAction(status: Status): { label: string; next: Status } | null {
  if (status === "pending" || status === "problem") {
    return { label: status === "problem" ? "Retomar" : "Iniciar", next: "in_progress" };
  }
  if (status === "in_progress") return { label: "Concluir", next: "done" };
  return null;
}

function TaskCard({
  task,
  busy,
  onStatus,
  onOccurrence,
}: {
  task: FieldTask;
  busy: boolean;
  onStatus: (task: FieldTask, next: Status) => void;
  onOccurrence: (task: FieldTask) => void;
}) {
  const primary = primaryAction(task.status);
  const attention = needsAttention(task.riskLevel);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.2, ease: EASE }}
      className={`rounded-3xl border bg-surface p-5 ${
        task.riskLevel === "overdue"
          ? "border-risk-overdue/40"
          : attention
            ? "border-risk-at-risk/40"
            : "border-line"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <RiskBadge level={task.riskLevel} />
        <StatusBadge status={task.status} />
        {task.urgency === "high" && (
          <span className="text-xs font-medium uppercase text-muted">
            Urgência {URGENCY_LABEL.high.toLowerCase()}
          </span>
        )}
      </div>
      {task.route && (
        <p className="mt-3 text-sm">
          <span className="font-semibold tabular-nums text-accent">{task.route.order}ª parada</span>
          <span className="text-muted">
            {" "}· chegada prevista {task.route.eta}
            {task.route.order > 1 &&
              ` · ${task.route.km.toFixed(1).replace(".", ",")} km, ${task.route.travelMin} min`}
          </span>
          {task.route.late && <span className="text-risk-overdue"> · não cabe no prazo</span>}
        </p>
      )}
      <h2 className="mt-3 text-lg font-semibold">{task.documentRef}</h2>
      <p className="text-sm">
        <span className="text-muted">Prazo </span>
        <span className="tabular-nums">{task.dueLabel}</span>
      </p>

      <div className="mt-3 border-t border-line pt-3 text-sm">
        <p className="font-medium">{task.agencyName}</p>
        {task.agencyAddress && <p className="text-muted">{task.agencyAddress}</p>}
        {task.agencyHours && (
          <p className="text-muted">
            Atendimento <span className="tabular-nums">{task.agencyHours}</span>
          </p>
        )}
        {task.agencyRequirements && (
          <p className="mt-2">
            <span className="text-label font-medium uppercase text-muted">Levar </span>
            {task.agencyRequirements}
          </p>
        )}
        {task.description && <p className="mt-2 text-muted">{task.description}</p>}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
        {primary ? (
          <Button
            type="button"
            className="h-12 text-base"
            disabled={busy}
            onClick={() => onStatus(task, primary.next)}
          >
            {busy ? "Salvando…" : primary.label}
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="button"
          variant="ghost"
          className="h-12"
          disabled={busy}
          onClick={() => onOccurrence(task)}
        >
          Ocorrência
        </Button>
      </div>
    </motion.li>
  );
}

export function FieldTaskList({ tasks }: { tasks: FieldTask[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [toast, setToast] = useState<Toast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const changeStatus = (taskId: string, next: Status, onOk?: () => void) => {
    setBusyId(taskId);
    setError(null);
    startTransition(async () => {
      const result = await updateTaskStatus(taskId, next);
      setBusyId(null);
      if (result.error) setError(result.error);
      else onOk?.();
    });
  };

  // Concluir abre a assinatura; os demais passos mudam o status direto.
  const onStatus = (task: FieldTask, next: Status) => {
    if (next === "done") {
      setSheet({ kind: "complete", task });
      return;
    }
    changeStatus(task.id, next, () =>
      setToast({ message: `${task.documentRef} em andamento` }),
    );
  };

  const closeSheet = useCallback(() => setSheet(null), []);
  const onOccurrenceDone = useCallback((message: string) => {
    setSheet(null);
    setToast({ message });
  }, []);
  // Desfazer volta ao status anterior; o banco apaga a assinatura da conclusão desfeita.
  const onCompleted = useCallback((task: FieldTask) => {
    setSheet(null);
    setToast({
      message: `${task.documentRef} concluída`,
      undo: { taskId: task.id, status: task.status },
    });
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      {error && (
        <p role="alert" className="mb-4 rounded-2xl bg-risk-overdue-soft px-3 py-2 text-sm text-risk-overdue">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-4">
        <AnimatePresence initial={false} mode="popLayout">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              busy={busyId === task.id}
              onStatus={onStatus}
              onOccurrence={(t) => setSheet({ kind: "occurrence", task: t })}
            />
          ))}
        </AnimatePresence>
      </ul>

      <Sheet
        open={sheet !== null}
        onClose={closeSheet}
        title={sheet?.kind === "complete" ? "Concluir com assinatura" : "Registrar ocorrência"}
        description={sheet ? `${sheet.task.documentRef} · ${sheet.task.agencyName}` : undefined}
      >
        {sheet?.kind === "occurrence" && (
          <OccurrenceForm
            key={sheet.task.id}
            taskId={sheet.task.id}
            onDone={onOccurrenceDone}
            onCancel={closeSheet}
          />
        )}
        {sheet?.kind === "complete" && (
          <CompletionForm
            key={sheet.task.id}
            taskId={sheet.task.id}
            onDone={() => onCompleted(sheet.task)}
            onCancel={closeSheet}
          />
        )}
      </Sheet>

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="pointer-events-auto flex w-full max-w-lg items-center justify-between gap-4 rounded-lg bg-ink px-4 py-2 text-paper"
            >
              <span className="text-sm">{toast.message}</span>
              {toast.undo && (
                <button
                  type="button"
                  className="min-h-11 px-2 text-sm font-semibold underline underline-offset-4"
                  onClick={() => {
                    const undo = toast.undo;
                    setToast(null);
                    if (undo) changeStatus(undo.taskId, undo.status);
                  }}
                >
                  Desfazer
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
