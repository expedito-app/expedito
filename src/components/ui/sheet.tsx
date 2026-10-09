"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
};

// Painel que sobe da base da tela (alcance do polegar no celular).
export function Sheet({ open, onClose, title, description, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current
      ?.querySelector<HTMLElement>("input, button, textarea, select")
      ?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-ink/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-title"
            className="relative w-full max-w-lg rounded-t-xl border-t border-line bg-paper px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <div aria-hidden className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
            <h2 id="sheet-title" className="text-title font-semibold">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            <div className="mt-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
