import { signOut } from "@/actions/auth";
import { IconLogout } from "@/components/ui/icons";
import { SidebarTooltip, sidebarButton, sidebarIdle } from "@/components/ui/sidebar";

export function SignOutButton({ variant = "text" }: { variant?: "text" | "sidebar" }) {
  return (
    <form action={signOut}>
      {variant === "sidebar" ? (
        <button type="submit" aria-label="Sair" className={`${sidebarButton} ${sidebarIdle}`}>
          <IconLogout />
          <SidebarTooltip label="Sair" />
        </button>
      ) : (
        <button
          type="submit"
          className="min-h-11 rounded-full px-3 text-sm text-muted transition-colors duration-150 hover:bg-surface hover:text-ink"
        >
          Sair
        </button>
      )}
    </form>
  );
}
