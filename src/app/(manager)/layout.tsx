import { Suspense } from "react";
import Link from "next/link";
import { AlertCenter } from "@/components/features/alert-center";
import { CurrentUserName } from "@/components/features/current-user-name";
import { ManagerNav } from "@/components/features/manager-nav";
import { RoleGate } from "@/components/features/role-gate";
import { SignOutButton } from "@/components/features/sign-out-button";
import { TaskAssistant } from "@/components/features/task-assistant";
import { PageFallback } from "@/components/ui/page-fallback";

// Sidebar escura flutuante só com ícones (embaixo, no celular) e o conteúdo
// num container arredondado sobre o fundo cinza-azulado.
export default function ManagerLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 gap-4 p-3 pb-24 md:p-4 md:pl-[6.5rem]">
      <aside
        aria-label="Navegação"
        className="fixed inset-x-3 bottom-3 z-30 flex items-center gap-2 overflow-x-auto rounded-full bg-ink p-2 md:inset-x-auto md:top-4 md:bottom-4 md:left-4 md:w-[4.5rem] md:flex-col md:overflow-visible md:rounded-[2rem] md:px-3 md:py-5"
      >
        <Link
          href="/painel"
          aria-label="Expedito: início"
          className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-ink md:flex"
        >
          Ex
        </Link>
        <div className="md:mt-8">
          <ManagerNav />
        </div>
        <div className="flex items-center gap-2 md:mt-auto md:flex-col">
          <TaskAssistant />
          <SignOutButton variant="sidebar" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col rounded-[2rem] bg-canvas">
        <header className="flex items-center justify-between gap-4 px-6 pt-6 md:px-10 md:pt-8">
          <p className="text-sm font-semibold tracking-tight">Expedito</p>
          <Suspense>
            <CurrentUserName />
          </Suspense>
        </header>
        <main className="w-full flex-1 px-6 pt-8 pb-12 md:px-10">
          <Suspense fallback={<PageFallback />}>
            <RoleGate role="manager">{children}</RoleGate>
          </Suspense>
        </main>
      </div>
      <AlertCenter />
    </div>
  );
}
