import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/features/sign-up-form";

export const metadata: Metadata = { title: "Cadastro · Expedito" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="font-serif text-display font-semibold">Criar conta</h1>
      <p className="mt-3 text-muted">
        Para gestores de expedição. A equipe de campo é cadastrada por você
        depois de entrar.
      </p>
      <div className="mt-10">
        <SignUpForm />
      </div>
      <p className="mt-8 text-sm text-muted">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </>
  );
}
