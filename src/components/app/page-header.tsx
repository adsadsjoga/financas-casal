import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Cabeçalho padrão de página: sobretítulo (eyebrow) opcional, título,
 * descrição opcional, ícone à esquerda e ação à direita. Antes cada página
 * escrevia seu próprio <h1> — 2 pesos de fonte, 3 trackings de eyebrow
 * diferentes e uma página sem subtítulo nenhum. Isso fica decidido aqui.
 */
export function PageHeader({
  titulo,
  descricao,
  sobretitulo,
  icone,
  acao,
  voltar,
  className,
}: {
  titulo: string;
  descricao?: React.ReactNode;
  sobretitulo?: string;
  icone?: React.ReactNode;
  acao?: React.ReactNode;
  voltar?: { href: string; rotulo?: string };
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {voltar && (
        <Link
          href={voltar.href}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ChevronLeft className="size-4" />
          {voltar.rotulo ?? "Voltar"}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {icone && (
            <span className="bg-secondary text-secondary-foreground flex size-11 shrink-0 items-center justify-center rounded-lg">
              {icone}
            </span>
          )}
          <div className="min-w-0">
            {sobretitulo && (
              <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-[0.14em] uppercase">
                {sobretitulo}
              </p>
            )}
            <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
            {descricao && <p className="text-muted-foreground mt-1 text-sm">{descricao}</p>}
          </div>
        </div>
        {acao && <div className="shrink-0">{acao}</div>}
      </div>
    </div>
  );
}
