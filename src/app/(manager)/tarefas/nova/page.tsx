import type { Metadata } from "next";
import { Suspense } from "react";
import { createTask } from "@/actions/tasks";
import { EMPTY_TASK, TaskForm } from "@/components/features/task-form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageFallback } from "@/components/ui/page-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { loadTaskOptions } from "@/lib/task-options";

export const metadata: Metadata = { title: "Nova tarefa · Expedito" };

async function NewTask() {
  const { agencies, members } = await loadTaskOptions();
  if (!agencies.length) {
    return (
      <EmptyState
        message="Cadastre uma agência antes de criar tarefas."
        actionHref="/agencias/nova"
        actionLabel="Cadastrar agência"
      />
    );
  }
  return (
    <TaskForm
      action={createTask}
      initial={EMPTY_TASK}
      agencies={agencies}
      members={members}
      submitLabel="Salvar tarefa"
    />
  );
}

export default function NovaTarefaPage() {
  return (
    <>
      <PageHeader eyebrow="Tarefas" title="Nova tarefa" />
      <div className="mt-12">
        <Suspense fallback={<PageFallback />}>
          <NewTask />
        </Suspense>
      </div>
    </>
  );
}
