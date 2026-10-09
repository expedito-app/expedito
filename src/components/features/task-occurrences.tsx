import { OCCURRENCE_LABEL, formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

// Ocorrências registradas pelo campo, para o gestor (RLS: manager_id = gestor).
export async function TaskOccurrences({ taskId }: { taskId: string }) {
  const supabase = await createClient();
  const [{ data: occurrences }, { data: people }] = await Promise.all([
    supabase
      .from("task_occurrences")
      .select("id, type, note, author_id, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const nameById = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return (
    <section aria-labelledby="ocorrencias" className="card mt-4 max-w-2xl">
      <h3 id="ocorrencias" className="text-label font-medium uppercase text-muted">
        Ocorrências
      </h3>
      {!occurrences?.length ? (
        <p className="mt-2 text-sm text-muted">Nenhuma ocorrência registrada.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {occurrences.map((o) => (
            <li key={o.id} className="py-3 text-sm">
              <p>
                <span className="font-medium">{OCCURRENCE_LABEL[o.type]}</span>
                <span className="text-muted">
                  {" · "}
                  {nameById.get(o.author_id) ?? "Equipe de campo"}
                  {" · "}
                  <span className="tabular-nums">{formatDateTime(o.created_at)}</span>
                </span>
              </p>
              {o.note && <p className="mt-1 text-muted">{o.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
