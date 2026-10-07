import { Suspense } from "react";
import { CurrentUserName } from "@/components/features/current-user-name";
import { RoleGate } from "@/components/features/role-gate";
import { SignOutButton } from "@/components/features/sign-out-button";
import { PageFallback } from "@/components/ui/page-fallback";

// Mobile-first: coluna única, alvos de toque de 44 px.
export default function FieldLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 py-2">
          <span className="font-serif text-lg font-semibold">Expedito</span>
          <div className="ml-auto flex items-center gap-2">
            <Suspense>
              <CurrentUserName />
            </Suspense>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <Suspense fallback={<PageFallback />}>
          <RoleGate role="field">{children}</RoleGate>
        </Suspense>
      </main>
    </div>
  );
}
