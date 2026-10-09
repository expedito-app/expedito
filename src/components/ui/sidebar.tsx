// Peças da sidebar escura flutuante (sem "use client": servem a servidor e cliente).

/** Botão redondo da sidebar; o rótulo aparece ao lado no hover/foco. */
export const sidebarButton =
  "group relative flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150";

export const sidebarIdle = "text-white/60 hover:bg-white/10 hover:text-white";

export function SidebarTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 md:block">
      {label}
    </span>
  );
}
