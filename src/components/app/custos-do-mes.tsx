"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addMeses, nomeDoMes } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { FatiaCategoria, GastoPessoa } from "@/lib/dashboard";

import { GraficoDespesasPorCategoria, GraficoGastosPorPessoa } from "./dashboard-charts";

export interface DespesaResumida {
  description: string;
  amount_cents: number;
}

/**
 * Seção de custos do mês: navegação de mês + donut de categorias +
 * comparação entre as duas pessoas + maiores despesas.
 *
 * O mês vive na URL porque os dados são buscados no servidor; navegar sem
 * isso obrigaria a carregar todos os meses de uma vez.
 */
export function CustosDoMes({
  mes,
  mesAtual,
  visao,
  despesasPorCategoria,
  gastosPorPessoa,
  maioresDespesas,
  moeda,
}: {
  mes: string;
  mesAtual: string;
  visao: string;
  despesasPorCategoria: FatiaCategoria[];
  /** null quando não há parceiro ou a visão é individual. */
  gastosPorPessoa: GastoPessoa[] | null;
  maioresDespesas: DespesaResumida[];
  moeda: string;
}) {
  const router = useRouter();
  const noMesAtual = mes >= mesAtual;

  function irParaMes(novoMes: string) {
    router.push(`/?visao=${visao}&mes=${novoMes}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold capitalize">{nomeDoMes(mes)}</h2>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => irParaMes(addMeses(mes, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => irParaMes(addMeses(mes, 1))}
            disabled={noMesAtual}
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GraficoDespesasPorCategoria dados={despesasPorCategoria} moeda={moeda} />
        <div className="space-y-4">
          {gastosPorPessoa && <GraficoGastosPorPessoa dados={gastosPorPessoa} moeda={moeda} />}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Maiores despesas</CardTitle>
              <p className="text-muted-foreground text-xs">As 5 do mês</p>
            </CardHeader>
            <CardContent>
              {maioresDespesas.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  Nenhuma despesa neste mês ainda.
                </p>
              ) : (
                <div className="divide-y divide-border/70">
                  {maioresDespesas.map((d, i) => (
                    <div
                      key={`${d.description}-${i}`}
                      className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0"
                    >
                      <span className="min-w-0 truncate">{d.description || "Sem descrição"}</span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatMoney(d.amount_cents, moeda)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
