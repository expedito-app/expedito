import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

// Assinatura coletada pelo campo na conclusão (RLS: manager_id = gestor).
export async function TaskSignature({ taskId }: { taskId: string }) {
  const supabase = await createClient();
  const { data: signature } = await supabase
    .from("task_signatures")
    .select("signer_name, image, signed_at, author_id")
    .eq("task_id", taskId)
    .maybeSingle();
  const { data: author } = signature
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", signature.author_id)
        .maybeSingle()
    : { data: null };

  return (
    <section aria-labelledby="assinatura" className="mt-16 max-w-xl border-t border-line pt-8">
      <h3 id="assinatura" className="text-label font-medium uppercase text-muted">
        Assinatura
      </h3>
      {!signature ? (
        <p className="mt-2 text-sm text-muted">
          Concluída sem assinatura (marcada pelo gestor ou antes da assinatura obrigatória).
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm">
            <span className="font-medium">Recebido por {signature.signer_name}</span>
            <span className="text-muted">
              {" · "}
              {author?.full_name ?? "Equipe de campo"}
              {" · "}
              <span className="tabular-nums">{formatDateTime(signature.signed_at)}</span>
            </span>
          </p>
          {/* Data URL pequena vinda do banco: next/image não otimizaria nada aqui. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signature.image}
            alt={`Assinatura de ${signature.signer_name}`}
            className="mt-4 h-36 w-full max-w-md rounded-md border border-line bg-white object-contain"
          />
        </>
      )}
    </section>
  );
}
