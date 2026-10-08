"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const items = [
  { href: "/painel", label: "Painel" },
  { href: "/indicadores", label: "Indicadores" },
  { href: "/tarefas", label: "Tarefas" },
  { href: "/agencias", label: "Agências" },
  { href: "/equipe", label: "Equipe" },
] as const;

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Principal" className="flex gap-1">
      {items.map((item) => {
        const active =
          pathname !== null &&
          (pathname === item.href || pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
              active ? "font-medium text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

// O caminho atual é dado da URL: em rotas dinâmicas ele só chega na requisição,
// então o menu sem destaque entra no shell estático e o destaque vem em seguida.
export function ManagerNav() {
  return (
    <Suspense fallback={<NavLinks pathname={null} />}>
      <ActiveNavLinks />
    </Suspense>
  );
}
