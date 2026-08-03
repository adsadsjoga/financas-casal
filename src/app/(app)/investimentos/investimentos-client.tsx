import { TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import type { PosicaoAtivo } from "@/lib/investimentos";

export function InvestimentosClient({
  posicoes,
  moeda,
}: {
  posicoes: PosicaoAtivo[];
  moeda: string;
}) {
  const totalAportado = posicoes.reduce((acc, p) => acc + p.aportadoLiquido, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Investimentos</h1>
        <p className="text-muted-foreground text-sm">
          Aporte líquido por ativo — o que entrou menos o que saiu de cada um.
        </p>
      </div>

      {posicoes.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="bg-secondary text-secondary-foreground flex size-12 items-center justify-center rounded-lg">
              <TrendingUp className="size-6" />
            </span>
            <div>
              <p className="font-medium">Nenhum investimento lançado ainda</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Aparece aqui automaticamente quando uma transação usa a
                categoria &quot;Investimentos&quot;.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-primary text-primary-foreground shadow-[0_14px_40px_oklch(0.25_0.08_164/0.2)] ring-0">
            <CardContent className="pt-1">
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-primary-foreground/65">
                Total aportado líquido
              </p>
              <p className="mt-1.5 text-[clamp(1.75rem,8vw,2.5rem)] leading-tight font-bold tabular-nums">
                {formatMoney(totalAportado, moeda)}
              </p>
              <p className="mt-1 text-xs text-primary-foreground/60">
                Não é valor de mercado — é quanto dinheiro seu está metido em
                cada ativo, sem contar valorização ou desvalorização.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="divide-y divide-border/70 p-0">
              {posicoes.map((p) => (
                <div key={p.ativo} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.ativo}</p>
                    <p className="text-muted-foreground text-xs">
                      {p.tipo} · {p.numTransacoes} lançamento{p.numTransacoes === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      p.aportadoLiquido < 0 ? "text-rose-600" : ""
                    }`}
                  >
                    {formatMoney(p.aportadoLiquido, moeda)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
