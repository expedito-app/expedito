import type { Metadata } from "next";

export const metadata: Metadata = { title: "Painel · Expedito" };

// Provisória (Fase 0). O painel com risco entra na Fase 2.
export default function PainelPage() {
  return (
    <>
      <p className="text-label font-medium uppercase text-muted">Hoje</p>
      <h1 className="mt-2 font-serif text-display font-semibold">
        Painel do dia
      </h1>
      <p className="mt-4 max-w-lg text-muted">
        Aqui vão aparecer as tarefas do dia, com destaque para as atrasadas e
        as em risco.
      </p>
    </>
  );
}
