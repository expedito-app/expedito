import type { Metadata } from "next";
import { Suspense } from "react";
import { FieldUserForm } from "@/components/features/field-user-form";
import { TransportSelect } from "@/components/features/transport-select";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Equipe · Expedito" };

async function FieldUserList() {
  const supabase = await createClient();
  // O RLS já limita aos usuários de campo do gestor logado.
  const { data: members, error } = await supabase
    .from("profiles")
    .select("id, full_name, transport_mode")
    .eq("role", "field")
    .order("full_name");

  if (error) {
    return (
      <p role="alert" className="text-sm text-risk-overdue">
        Não foi possível carregar a equipe.
      </p>
    );
  }
  if (!members.length) {
    return (
      <p className="text-sm text-muted">
        Nenhum usuário de campo cadastrado ainda.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-line border-y border-line">
      {members.map((member) => (
        <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <span>{member.full_name}</span>
          <TransportSelect
            memberId={member.id}
            memberName={member.full_name}
            value={member.transport_mode}
          />
        </li>
      ))}
    </ul>
  );
}

export default function EquipePage() {
  return (
    <>
      <p className="text-label font-medium uppercase text-muted">Cadastro</p>
      <h1 className="mt-2 font-serif text-display font-semibold">Equipe</h1>
      <div className="mt-12 grid gap-16 md:grid-cols-2">
        <section aria-labelledby="novo-usuario">
          <h2 id="novo-usuario" className="font-serif text-title">
            Novo usuário de campo
          </h2>
          <p className="mt-2 text-sm text-muted">
            Ele entra com este e-mail e a senha temporária, cria a própria
            senha no primeiro acesso e vê apenas as tarefas atribuídas a ele.
          </p>
          <div className="mt-8">
            <FieldUserForm />
          </div>
        </section>
        <section aria-labelledby="membros">
          <h2 id="membros" className="font-serif text-title">
            Usuários de campo
          </h2>
          <div className="mt-8">
            <Suspense
              fallback={<p className="text-sm text-muted">Carregando…</p>}
            >
              <FieldUserList />
            </Suspense>
          </div>
        </section>
      </div>
    </>
  );
}
