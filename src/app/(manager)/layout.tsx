import { Suspense } from "react";
import Link from "next/link";
import { ManagerNav } from "@/components/features/manager-nav";
import { CurrentUserName } from "@/components/features/current-user-name";
import { RoleGate } from "@/components/features/role-gate";
import { SignOutButton } from "@/components/features/sign-out-button";
import { PageFallback } from "@/components/ui/page-fallback";

export default function ManagerLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-6 py-3">
          <Link href="/painel" className="font-serif text-lg font-semibold">
            Expedito
          </Link>
          <ManagerNav />
          <div className="ml-auto flex items-center gap-4">
            <Suspense>
              <CurrentUserName />
            </Suspense>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <Suspense fallback={<PageFallback />}>
          <RoleGate role="manager">{children}</RoleGate>
        </Suspense>
      </main>
    </div>
  );
}
