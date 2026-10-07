import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deleteTask, updateTask } from "@/actions/tasks";
import { TaskForm } from "@/components/features/task-form";
import { TaskOccurrences } from "@/components/features/task-occurrences";
import { DeleteButton } from "@/components/ui/delete-button";
import { PageFallback } from "@/components/ui/page-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime, toDateTimeLocal } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { loadTaskOptions } from "@/lib/task-options";
import { uuidSchema } from "@/lib/validation/form-state";

export const metadata: Metadata = { title: "Editar tarefa · Expedito" };

async function EditTask({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: task }, options] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", id).maybeSingle(),
    loadTaskOptions(),
  ]);
  if (!task) notFound();

  return (
    <>
      <h2 className="font-serif text-title">{task.document_ref}</h2>
      {task.completed_at && (
        <p className="mt-2 text-sm text-muted">
          Concluída em {formatDateTime(task.completed_at)}
        </p>
      )}
      <div className="mt-8">
        <TaskForm
          action={updateTask.bind(null, task.id)}
          initial={{
            agencyId: task.agency_id,
            documentRef: task.document_ref,
            description: task.description ?? "",
            urgency: task.urgency,
            dueAt: toDateTimeLocal(task.due_at),
            assignedTo: task.assigned_to ?? "",
            status: task.status,
          }}
          agencies={options.agencies}
          members={options.members}
          submitLabel="Salvar alterações"
        />
      </div>
      <TaskOccurrences taskId={task.id} />
      <section
        aria-labelledby="excluir-tarefa"
        className="mt-16 max-w-xl border-t border-line pt-8"
      >
        <h3
          id="excluir-tarefa"
          className="text-label font-medium uppercase text-muted"
        >
          Excluir
        </h3>
        <p className="mt-2 mb-4 text-sm text-muted">
          A tarefa e as ocorrências registradas nela serão apagadas.
        </p>
        <DeleteButton
          action={deleteTask.bind(null, task.id)}
          label="Excluir tarefa"
          confirmLabel="Confirmar exclusão"
        />
      </section>
    </>
  );
}

export default function EditarTarefaPage({
  params,
}: PageProps<"/tarefas/[id]">) {
  return (
    <>
      <PageHeader eyebrow="Tarefas" title="Editar tarefa" />
      <div className="mt-12">
        <Suspense fallback={<PageFallback />}>
          <EditTask params={params} />
        </Suspense>
      </div>
    </>
  );
}
