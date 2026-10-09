import type { Metadata } from "next";
import { LoginForm } from "@/components/features/login-form";

export const metadata: Metadata = { title: "Entrar · Expedito" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-display font-light">Entrar</h1>
      <p className="mt-3 text-muted">
        Acompanhe quem está com o quê e o que está em risco.
      </p>
      <div className="mt-10">
        <LoginForm />
      </div>
      <p className="mt-8 text-sm text-muted">
        O acesso é criado pela administração (gestores) ou pelo seu gestor
        (equipe de campo).
      </p>
    </>
  );
}
