import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Card hero em destaque (fundo primary) — usado para o número mais
 * importante da tela (patrimônio na Home, total aportado em Investimentos).
 * Estava copiado caractere por caractere nos dois lugares; agora é um só.
 * `children` é um slot livre para o rodapé, que diverge entre os usos
 * (grade entrou/saiu na Home, linha de valor de mercado em Investimentos).
 */
export function CardDestaque({
  rotulo,
  valor,
  nota,
  icone,
  children,
  className,
}: {
  rotulo: string;
  valor: string;
  nota?: React.ReactNode;
  icone?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "bg-primary text-primary-foreground shadow-[0_14px_40px_oklch(0.25_0.08_164/0.2)] ring-0",
        className,
      )}
    >
      <CardContent className="space-y-3 pt-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-primary-foreground/65 text-xs font-semibold tracking-[0.13em] uppercase">
              {rotulo}
            </p>
            <p className="mt-1.5 text-[clamp(1.75rem,8vw,2.5rem)] leading-tight font-bold tabular-nums">
              {valor}
            </p>
            {nota && <p className="text-primary-foreground/60 mt-1 text-xs">{nota}</p>}
          </div>
          {icone && (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
              {icone}
            </span>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
