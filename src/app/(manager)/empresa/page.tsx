import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanyForm } from "@/components/features/company-form";
import { PageFallback } from "@/components/ui/page-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Empresa · Expedito" };

async function CompanySettings() {
  const profile = await getCurrentProfile();
  return (
    <div className="card max-w-2xl">
      <p className="text-sm text-muted">
        As rotas da equipe saem deste endereço. Ao mudar o endereço, localizamos de novo.
      </p>
      <div className="mt-8">
        <CompanyForm
          submitLabel="Salvar"
          initial={{
            companyName: profile?.company_name ?? "",
            baseAddress: profile?.base_address ?? "",
            baseLatitude: profile?.base_latitude == null ? "" : String(profile.base_latitude),
            baseLongitude: profile?.base_longitude == null ? "" : String(profile.base_longitude),
          }}
        />
      </div>
    </div>
  );
}

export default function EmpresaPage() {
  return (
    <>
      <PageHeader eyebrow="Configurações" title="Empresa" />
      <div className="mt-10">
        <Suspense fallback={<PageFallback />}>
          <CompanySettings />
        </Suspense>
      </div>
    </>
  );
}
