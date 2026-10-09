import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deleteAgency, updateAgency } from "@/actions/agencies";
import { AgencyForm } from "@/components/features/agency-form";
import { DeleteButton } from "@/components/ui/delete-button";
import { PageFallback } from "@/components/ui/page-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation/form-state";

export const metadata: Metadata = { title: "Editar agência · Expedito" };

async function EditAgency({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: agency } = await supabase
    .from("agencies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!agency) notFound();

  return (
    <>
      <h2 className="text-title font-medium">{agency.name}</h2>
      <div className="mt-8">
        <AgencyForm
          action={updateAgency.bind(null, agency.id)}
          initial={{
            name: agency.name,
            address: agency.address ?? "",
            opensAt: formatTime(agency.opens_at),
            closesAt: formatTime(agency.closes_at),
            requirements: agency.requirements ?? "",
            notes: agency.notes ?? "",
            latitude: agency.latitude === null ? "" : String(agency.latitude),
            longitude: agency.longitude === null ? "" : String(agency.longitude),
          }}
          submitLabel="Salvar alterações"
        />
      </div>
      <section
        aria-labelledby="excluir-agencia"
        className="card mt-4 max-w-2xl"
      >
        <h3
          id="excluir-agencia"
          className="text-label font-medium uppercase text-muted"
        >
          Excluir
        </h3>
        <p className="mt-2 mb-4 text-sm text-muted">
          Só é possível excluir agências sem tarefas vinculadas.
        </p>
        <DeleteButton
          action={deleteAgency.bind(null, agency.id)}
          label="Excluir agência"
          confirmLabel="Confirmar exclusão"
        />
      </section>
    </>
  );
}

export default function EditarAgenciaPage({
  params,
}: PageProps<"/agencias/[id]">) {
  return (
    <>
      <PageHeader eyebrow="Agências" title="Editar agência" />
      <div className="mt-12">
        <Suspense fallback={<PageFallback />}>
          <EditAgency params={params} />
        </Suspense>
      </div>
    </>
  );
}
