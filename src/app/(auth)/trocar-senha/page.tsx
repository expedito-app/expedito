import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/features/change-password-form";
import { SignOutButton } from "@/components/features/sign-out-button";

export const metadata: Metadata = { title: "Criar senha · Expedito" };

// Primeiro acesso: o proxy.ts só libera esta tela enquanto a senha
// temporária não for trocada.
export default function ChangePasswordPage() {
  return (
    <>
      <h1 className="font-serif text-display font-semibold">Crie sua senha</h1>
      <p className="mt-3 text-muted">
        Você entrou com uma senha temporária. Escolha uma senha pessoal para
        continuar.
      </p>
      <div className="mt-10">
        <ChangePasswordForm />
      </div>
      <div className="mt-6 -ml-2">
        <SignOutButton />
      </div>
    </>
  );
}
