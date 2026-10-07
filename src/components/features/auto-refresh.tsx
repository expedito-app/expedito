"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Recarrega os dados do servidor periodicamente (o risco muda com o relógio).
// Pausa com a aba em segundo plano e atualiza assim que ela volta.
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();

  useEffect(() => {
    let lastRefresh = Date.now();
    const refresh = () => {
      lastRefresh = Date.now();
      router.refresh();
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, intervalMs);

    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastRefresh >= intervalMs
      ) {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
