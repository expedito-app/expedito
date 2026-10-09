import type { Metadata } from "next";
import { Suspense } from "react";
import { CompanyForm } from "@/components/features/company-form";
import { DemurrageForm } from "@/components/features/demurrage-form";
import { settingsFromProfile } from "@/lib/demurrage";
import { PageFallback } from "@/components/ui/page-fallback";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Empresa · Expedito" };

async function CompanySettings() {
  const profile = await getCurrentProfile();
  const demurrage = settingsFromProfile(profile);
  const decimal = (n: number) => String(n).replace(".", ",");
  return (
    <div className="grid gap-4 xl:grid-cols-2">
    <div className="card">
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
    <div className="card">
      <h2 className="text-title font-medium">Premissas de demurrage</h2>
      <p className="mt-1 text-sm text-muted">
        Usadas para estimar quanto o Expedito evita em sobre-estadia (painel e Indicadores).
      </p>
      <div className="mt-8">
        <DemurrageForm
          initial={{
            dailyBrl: decimal(demurrage.dailyBrl),
            containersPerBl: decimal(demurrage.containersPerBl),
            daysPerDelay: decimal(demurrage.daysPerDelay),
            baselinePercent: decimal(Math.round(demurrage.baselineLateRate * 1000) / 10),
          }}
        />
      </div>
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
