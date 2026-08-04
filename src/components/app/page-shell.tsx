import { cn } from "@/lib/utils";

type LarguraPagina = "conteudo" | "painel";

const LARGURAS: Record<LarguraPagina, string> = {
  // Leitura/lista/formulário — a maioria das páginas.
  conteudo: "max-w-3xl",
  // Grades de cards (dashboard, carros) precisam de mais espaço em telas largas.
  painel: "max-w-5xl",
};

/**
 * Container padrão de toda página do app: largura máxima + ritmo vertical
 * consistentes. Antes cada página inventava o seu (5 larguras e 4 ritmos
 * diferentes coexistiam) — este componente é o único lugar que decide isso.
 *
 * No mobile as duas larguras são idênticas (o <main> já limita a tela);
 * a diferença só aparece a partir do breakpoint `md`.
 */
export function PageShell({
  children,
  largura = "conteudo",
  className,
}: {
  children: React.ReactNode;
  largura?: LarguraPagina;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full space-y-5 md:space-y-6", LARGURAS[largura], className)}>
      {children}
    </div>
  );
}
