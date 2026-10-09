import { Suspense } from "react";
import { AlertCenter } from "@/components/features/alert-center";
import { CurrentUserName } from "@/components/features/current-user-name";
import { RoleGate } from "@/components/features/role-gate";
import { SignOutButton } from "@/components/features/sign-out-button";
import { PageFallback } from "@/components/ui/page-fallback";

// Mobile-first: barra escura arredondada no topo, coluna única, alvos de 44 px.
export default function FieldLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col p-3">
      <header className="mx-auto flex w-full max-w-lg items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-5 text-white">
        <span className="text-sm font-semibold">Expedito</span>
        <div className="ml-auto flex items-center gap-1 [&_p]:text-white [&_.text-muted]:text-white/60">
          <Suspense>
            <CurrentUserName />
          </Suspense>
          <SignOutButton variant="sidebar" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-1 py-8">
        <Suspense fallback={<PageFallback />}>
          <RoleGate role="field">{children}</RoleGate>
        </Suspense>
      </main>
      <AlertCenter placement="top" />
    </div>
  );
}
