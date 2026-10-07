import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/features/login-form";

export const metadata: Metadata = { title: "Entrar · Expedito" };

export default function LoginPage() {
  return (
    <>
      <h1 className="font-serif text-display font-semibold">Entrar</h1>
      <p className="mt-3 text-muted">
        Acompanhe quem está com o quê e o que está em risco.
      </p>
      <div className="mt-10">
        <LoginForm />
      </div>
      <p className="mt-8 text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link
          href="/cadastro"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          Cadastre-se como gestor
        </Link>
      </p>
    </>
  );
}
