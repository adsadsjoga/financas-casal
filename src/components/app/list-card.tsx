import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Trio para o padrão de lista mais comum do app: um Card contendo linhas
 * separadas por divisor. Existiam 3 variações (Card+divide-y, border-b sem
 * Card, um Card por item) — esta é a que vira padrão. Card-por-item continua
 * válido só quando o item carrega progresso/gráfico próprio (Metas,
 * Orçamentos): ver docs/convencoes.md.
 */
export function ListCard({
  children,
  className,
}: {
  children: React.ReactNode;
  /** Aplicada na área de rolagem (CardContent), não no Card — por exemplo
   * `max-h-[28rem] overflow-y-auto` para uma lista longa dentro de um card. */
  className?: string;
}) {
  return (
    <Card className="py-0">
      <CardContent className={cn("divide-border/70 divide-y p-0", className)}>
        {children}
      </CardContent>
    </Card>
  );
}

export function ListRow({
  children,
  asChild = false,
  className,
}: {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      className={cn(
        // min-h-11 (44px) garante alvo de toque confortável no celular.
        "flex min-h-11 items-center gap-3 px-(--card-spacing) py-3",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

export function ListEmpty({
  icone,
  titulo,
  descricao,
  acao,
}: {
  icone: React.ReactNode;
  titulo: string;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="bg-secondary text-secondary-foreground flex size-12 items-center justify-center rounded-lg">
          {icone}
        </span>
        <div>
          <p className="font-medium">{titulo}</p>
          {descricao && (
            <p className="text-muted-foreground mt-1 text-sm">{descricao}</p>
          )}
        </div>
        {acao}
      </CardContent>
    </Card>
  );
}
