"use client";

import Link from "next/link";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DashboardTask } from "@/lib/dashboard";
import { STATUS_LABEL, URGENCY_LABEL } from "@/lib/format";
import { needsAttention } from "@/lib/risk";
import type { Enums } from "@/types/database";

const EASE = [0.22, 1, 0.36, 1] as const;
const STATUS_ORDER: Enums<"task_status">[] = [
  "problem",
  "pending",
  "in_progress",
  "done",
];

type Group = { key: string; title: string; tasks: DashboardTask[]; attention?: boolean };

function groupTasks(tasks: DashboardTask[]): Group[] {
  const attention = tasks.filter((t) => needsAttention(t.riskLevel));
  const rest = tasks.filter((t) => !needsAttention(t.riskLevel));
  const groups: Group[] = [
    { key: "attention", title: "Precisa de atenção", tasks: attention, attention: true },
    ...STATUS_ORDER.map((status) => ({
      key: status,
      title: STATUS_LABEL[status],
      tasks: rest.filter((t) => t.status === status),
    })),
  ];
  return groups.filter((g) => g.tasks.length > 0);
}

function TaskRow({ task }: { task: DashboardTask }) {
  const attention = needsAttention(task.riskLevel);
  return (
    <motion.li
      layout="position"
      layoutId={task.id}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
      className={`relative grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_6.5rem_3.5rem_14rem] md:items-center ${
        attention ? "pl-4" : ""
      }`}
    >
      {attention && (
        <span
          aria-hidden
          className={`absolute inset-y-3 left-0 w-0.5 rounded-full ${
            task.riskLevel === "overdue" ? "bg-risk-overdue" : "bg-risk-at-risk"
          }`}
        />
      )}
      <div className="min-w-0">
        <Link
          href={`/tarefas/${task.id}`}
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          {task.documentRef}
        </Link>
        <p className="mt-0.5 truncate text-sm text-muted">
          {task.agencyName}
          {task.agencyClosesLabel && ` · ${task.agencyClosesLabel}`}
        </p>
        {task.occurrenceCount > 0 && (
          <p className="mt-1 text-xs font-medium text-ink">
            {task.occurrenceCount === 1
              ? "1 ocorrência registrada"
              : `${task.occurrenceCount} ocorrências registradas`}
          </p>
        )}
      </div>
      <p className="order-last col-span-2 text-sm md:order-none md:col-span-1">
        {task.assigneeName ?? <span className="text-muted">Sem responsável</span>}
      </p>
      <p className="text-right text-sm tabular-nums md:text-left">
        <span className="sr-only">Prazo: </span>
        {task.dueLabel}
      </p>
      <p className="hidden text-sm text-muted md:block">
        <span className="sr-only">Urgência: </span>
        {URGENCY_LABEL[task.urgency]}
      </p>
      <div className="col-span-2 flex flex-wrap items-center gap-3 md:col-span-1 md:justify-end">
        <RiskBadge level={task.riskLevel} />
        <StatusBadge status={task.status} />
      </div>
    </motion.li>
  );
}

export function DashboardList({ tasks }: { tasks: DashboardTask[] }) {
  const groups = groupTasks(tasks);
  return (
    // reducedMotion="user": sem animação para quem pede menos movimento.
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <div className="flex flex-col gap-12">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`grupo-${group.key}`}>
              <h2
                id={`grupo-${group.key}`}
                className={`flex items-baseline gap-2 border-b pb-2 text-label font-medium uppercase ${
                  group.attention
                    ? "border-risk-overdue/30 text-risk-overdue"
                    : "border-line text-muted"
                }`}
              >
                {group.title}
                <span className="tabular-nums">({group.tasks.length})</span>
              </h2>
              <ul className="divide-y divide-line">
                <AnimatePresence initial={false} mode="popLayout">
                  {group.tasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}
