"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

function PendingMark() {
  const { pending } = useLinkStatus();

  return pending ? (
    <span aria-hidden="true" className="bg-primary absolute inset-y-2 left-0 w-0.5 animate-pulse rounded-full" />
  ) : null;
}

export function AppNavLink({
  children,
  className,
  ...props
}: ComponentProps<typeof Link> & { children: ReactNode }) {
  return (
    // Sem `prefetch` forçado: com 10 itens de menu, abrir uma página
    // disparava 10 renderizações no servidor ao mesmo tempo, cada uma
    // consultando o Supabase — multiplicava por 10 a carga no banco e
    // ajudava a estourar o statement_timeout. O padrão do Next (prefetch
    // ao passar o mouse / entrar na viewport) já dá a navegação rápida.
    <Link {...props} className={cn("relative", className)}>
      <PendingMark />
      {children}
    </Link>
  );
}
