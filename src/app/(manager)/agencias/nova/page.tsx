import type { Metadata } from "next";
import { createAgency } from "@/actions/agencies";
import { AgencyForm, EMPTY_AGENCY } from "@/components/features/agency-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Nova agência · Expedito" };

export default function NovaAgenciaPage() {
  return (
    <>
      <PageHeader eyebrow="Agências" title="Nova agência" />
      <div className="mt-12">
        <AgencyForm
          action={createAgency}
          initial={EMPTY_AGENCY}
          submitLabel="Salvar agência"
        />
      </div>
    </>
  );
}
