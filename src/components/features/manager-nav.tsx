"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ComponentType, type SVGProps } from "react";
import {
  IconBuilding,
  IconChart,
  IconHome,
  IconList,
  IconRoute,
  IconSettings,
  IconUsers,
} from "@/components/ui/icons";
import { SidebarTooltip, sidebarButton, sidebarIdle } from "@/components/ui/sidebar";

type Item = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> };

const items: Item[] = [
  { href: "/painel", label: "Painel", icon: IconHome },
  { href: "/indicadores", label: "Indicadores", icon: IconChart },
  { href: "/tarefas", label: "Tarefas", icon: IconList },
  { href: "/rotas", label: "Rotas", icon: IconRoute },
  { href: "/agencias", label: "Agências", icon: IconBuilding },
  { href: "/equipe", label: "Equipe", icon: IconUsers },
  { href: "/empresa", label: "Empresa", icon: IconSettings },
];

function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Principal" className="flex gap-1 md:flex-col md:gap-2">
      {items.map((item) => {
        const active =
          pathname !== null &&
          (pathname === item.href || pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={`${sidebarButton} ${
              active ? "bg-white text-ink" : sidebarIdle
            }`}
          >
            <Icon />
            <SidebarTooltip label={item.label} />
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
