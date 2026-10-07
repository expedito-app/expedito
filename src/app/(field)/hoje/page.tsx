import type { Metadata } from "next";

export const metadata: Metadata = { title: "Hoje · Expedito" };

// Provisória (Fase 0). A lista do dia entra na Fase 3.
export default function HojePage() {
  return (
    <>
      <p className="text-label font-medium uppercase text-muted">Hoje</p>
      <h1 className="mt-2 font-serif text-title font-semibold">
        Suas tarefas
      </h1>
      <p className="mt-4 text-muted">
        Aqui vão aparecer as visitas atribuídas a você.
      </p>
    </>
  );
}
