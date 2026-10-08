import type { Metadata } from "next";
import { ImportForm } from "@/components/features/import-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Importar tarefas · Expedito" };

export default function ImportarPage() {
  return (
    <>
      <PageHeader eyebrow="Tarefas" title="Importar planilha" />
      <div className="mt-12">
        <ImportForm />
      </div>
    </>
  );
}
