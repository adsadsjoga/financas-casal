"use client";

import { useEffect } from "react";

/** Registra o service worker. Só em produção — em dev ele atrapalha o HMR. */
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const timer = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Navegador sem suporte ou modo privado: o app funciona igual, só
        // não instala na tela inicial.
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
