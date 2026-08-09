"use client";

import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

export interface OpcaoVisao {
  /** "casal" ou o profile_id da pessoa. */
  valor: string;
  rotulo: string;
  icone: string;
}

/**
 * Alterna a home entre a visão do casal e a de cada pessoa. O estado vive na
 * URL (`?visao=`) para o Server Component poder filtrar as consultas — não dá
 * para filtrar no cliente sem trazer contas e transações que a visão nem usa.
 */
export function SeletorVisao({
  opcoes,
  atual,
  mes,
  basePath = "/",
  parametros,
}: {
  opcoes: OpcaoVisao[];
  atual: string;
  /** Só a home navega por mês; outras páginas (ex. Investimentos) omitem. */
  mes?: string;
  parametros?: Record<string, string | undefined>;
  basePath?: string;
}) {

  function href(valor: string) {
    const params = new URLSearchParams();
    params.set("visao", valor);
    if (mes) params.set("mes", mes);
    for (const [chave, parametro] of Object.entries(parametros ?? {})) {
      if (parametro) params.set(chave, parametro);
    }
    return `${basePath}?${params.toString()}`;
  }
  const router = useRouter();

  return (
    <div className="bg-muted flex gap-0.5 rounded-lg p-0.5">
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === atual;
        return (
          <button
            key={opcao.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => router.push(href(opcao.valor))}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
              ativo
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{opcao.icone}</span>
            <span className="truncate">{opcao.rotulo}</span>
          </button>
        );
      })}
    </div>
  );
}
