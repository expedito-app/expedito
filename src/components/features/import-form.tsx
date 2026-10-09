"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importTasks, type ImportState } from "@/actions/import";
import { Button } from "@/components/ui/button";

const TEMPLATE =
  "Documento;Agência;Prazo;Urgência;Responsável;Descrição\r\n" +
  "MAEU123456789;Nome da agência;09/10/2026 15:00;Alta;Nome do responsável;Retirar BL original\r\n";

const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${TEMPLATE}`)}`;

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importTasks, {});

  return (
    <div className="card flex max-w-2xl flex-col gap-6">
      <div className="text-sm text-muted">
        <p>
          Colunas: <strong className="text-ink">Documento</strong>,{" "}
          <strong className="text-ink">Agência</strong> e <strong className="text-ink">Prazo</strong>{" "}
          (obrigatórias), Urgência, Responsável e Descrição. Os nomes de agência e de responsável
          precisam ser iguais aos cadastrados (sem diferença de acento ou maiúscula).
        </p>
        <p className="mt-2">
          Prazo como 09/10/2026 15:00. Sem horário, vale o fechamento da agência. No Excel ou no
          Google Sheets, salve/baixe como CSV.
        </p>
        <a
          href={templateHref}
          download="modelo-tarefas-expedito.csv"
          className="mt-3 inline-block font-medium text-accent underline-offset-4 hover:underline"
        >
          Baixar modelo de planilha
        </a>
      </div>

      <form key={state.created} action={action} className="flex flex-col gap-4">
        <label htmlFor="file" className="text-label font-medium uppercase text-muted">
          Arquivo CSV
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="text-sm file:mr-4 file:h-10 file:rounded-full file:border file:border-line file:bg-surface file:px-4 file:text-sm file:text-ink"
        />
        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Importando…" : "Importar tarefas"}
          </Button>
          <Link
            href="/tarefas"
            className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm text-ink hover:bg-surface"
          >
            Voltar
          </Link>
        </div>
      </form>

      {state.created !== undefined && (
        <p role="status" className="rounded-2xl bg-risk-ok-soft px-3 py-2 text-sm text-risk-ok">
          {state.created} {state.created === 1 ? "tarefa importada" : "tarefas importadas"}.{" "}
          <Link href="/tarefas" className="font-medium underline underline-offset-4">
            Ver tarefas
          </Link>
        </p>
      )}
      {state.error && (
        <div role="alert" className="rounded-2xl bg-risk-overdue-soft px-3 py-2 text-sm text-risk-overdue">
          <p>{state.error}</p>
          {state.problems && (
            <ul className="mt-2 list-disc pl-5">
              {state.problems.map((p) => (
                <li key={`${p.line}-${p.message}`}>
                  Linha {p.line}: {p.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
