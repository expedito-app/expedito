import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonBase, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageFallback } from "@/components/ui/page-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { formatOpeningHours } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Agências · Expedito" };

async function AgencyTable() {
  const supabase = await createClient();
  // O RLS limita às agências do gestor logado.
  const { data: agencies, error } = await supabase
    .from("agencies")
    .select("id, name, address, opens_at, closes_at, requirements")
    .order("name");

  if (error) {
    return (
      <p role="alert" className="text-sm text-risk-overdue">
        Não foi possível carregar as agências.
      </p>
    );
  }
  if (!agencies.length) {
    return (
      <EmptyState
        message="Nenhuma agência cadastrada ainda."
        actionHref="/agencias/nova"
        actionLabel="Cadastrar a primeira agência"
      />
    );
  }
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-line text-label uppercase text-muted">
          <th scope="col" className="py-3 pr-4 font-medium">Agência</th>
          <th scope="col" className="py-3 pr-4 font-medium">Atendimento</th>
          <th scope="col" className="hidden py-3 font-medium md:table-cell">
            Exigências
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {agencies.map((agency) => (
          <tr key={agency.id} className="align-top">
            <td className="py-4 pr-4">
              <Link
                href={`/agencias/${agency.id}`}
                className="font-medium text-ink underline-offset-4 hover:underline"
              >
                {agency.name}
              </Link>
              {agency.address && (
                <p className="mt-1 text-muted">{agency.address}</p>
              )}
            </td>
            <td className="py-4 pr-4 tabular-nums whitespace-nowrap">
              {formatOpeningHours(agency.opens_at, agency.closes_at) || (
                <span className="text-muted">Não informado</span>
              )}
            </td>
            <td className="hidden max-w-md py-4 text-muted md:table-cell">
              <p className="line-clamp-2">{agency.requirements || "—"}</p>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AgenciasPage() {
  return (
    <>
      <PageHeader
        eyebrow="Cadastro"
        title="Agências"
        action={
          <Link
            href="/agencias/nova"
            className={`${buttonBase} ${buttonVariants.primary}`}
          >
            Nova agência
          </Link>
        }
      />
      <div className="mt-12">
        <Suspense fallback={<PageFallback />}>
          <AgencyTable />
        </Suspense>
      </div>
    </>
  );
}
