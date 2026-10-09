import type { Metadata } from "next";
import { CompanyForm } from "@/components/features/company-form";
import { SignOutButton } from "@/components/features/sign-out-button";

export const metadata: Metadata = { title: "Sua empresa · Expedito" };

const EMPTY = { companyName: "", baseAddress: "", baseLatitude: "", baseLongitude: "" };

// Primeiro acesso do gestor: o proxy.ts só libera esta tela até a empresa e
// o endereço-base estarem cadastrados (as rotas da equipe saem daqui).
export default function CompanySetupPage() {
  return (
    <>
      <h1 className="text-display font-light">Sua empresa</h1>
      <p className="mt-3 text-muted">
        Para montar as rotas da equipe, precisamos saber de onde ela sai. Informe o nome e o
        endereço da empresa.
      </p>
      <div className="mt-10">
        <CompanyForm initial={EMPTY} submitLabel="Salvar e continuar" />
      </div>
      <div className="mt-6 -ml-2">
        <SignOutButton />
      </div>
    </>
  );
}
