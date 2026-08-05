"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOEDAS, ehMoedaConhecida, formatCompactMoney, formatMoney } from "@/lib/money";
import { corFatia } from "@/lib/dashboard";
import type { FatiaAlocacao, AporteMensal } from "@/lib/investimentos";

const compacto = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatEixo(cents: number, moeda: string): string {
  const simbolo = ehMoedaConhecida(moeda) ? MOEDAS[moeda].simbolo : moeda;
  return `${simbolo}${compacto.format(cents / 100)}`;
}

/**
 * Donut de alocação por tipo de ativo — mesmo desenho de
 * `GraficoDespesasPorCategoria` em `dashboard-charts.tsx` (stroke-dasharray
 * sobre pathLength=100), com legenda de tipo em vez de categoria.
 */
export function GraficoAlocacaoPorTipo({
  dados,
  moeda,
}: {
  dados: FatiaAlocacao[];
  moeda: string;
}) {
  const [ativo, setAtivo] = useState<string | null>(null);
  const total = dados.reduce((acc, d) => acc + d.total, 0);

  const fatias = useMemo(() => {
    const pcts = dados.map((item) => (total > 0 ? (item.total / total) * 100 : 0));
    return dados.map((item, i) => ({
      item,
      pct: pcts[i],
      offset: -pcts.slice(0, i).reduce((acc, p) => acc + p, 0) - 25,
      cor: corFatia(i, item.nome),
    }));
  }, [dados, total]);

  const itemAtivo = dados.find((d) => d.nome === ativo) ?? null;
  const pctAtivo = itemAtivo && total > 0 ? (itemAtivo.total / total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alocação da carteira</CardTitle>
        <p className="text-muted-foreground text-xs">
          Por tipo de ativo · tipos com saldo líquido negativo (mais resgatado que aportado) ficam de fora
        </p>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <p className="text-muted-foreground py-16 text-center text-sm">
            Nenhum investimento lançado ainda.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="relative mx-auto size-44">
              <svg viewBox="0 0 42 42" className="size-full -rotate-0">
                {fatias.map(({ item, pct, offset, cor }) => {
                  const selecionado = ativo === item.nome;
                  return (
                    <circle
                      key={item.nome}
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="none"
                      stroke={cor}
                      strokeWidth={selecionado ? 7 : 5.5}
                      pathLength={100}
                      strokeDasharray={`${Math.max(pct - 0.6, 0.4)} ${100 - Math.max(pct - 0.6, 0.4)}`}
                      strokeDashoffset={offset}
                      className="cursor-pointer transition-[stroke-width]"
                      onMouseEnter={() => setAtivo(item.nome)}
                      onMouseLeave={() => setAtivo(null)}
                      onClick={() => setAtivo(selecionado ? null : item.nome)}
                    >
                      <title>{`${item.nome}: ${formatMoney(item.total, moeda)} (${pct.toFixed(1)}%)`}</title>
                    </circle>
                  );
                })}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                {itemAtivo ? (
                  <>
                    <span className="text-sm font-bold tabular-nums">
                      {formatCompactMoney(itemAtivo.total, moeda)}
                    </span>
                    <span className="text-muted-foreground text-[11px] tabular-nums">
                      {pctAtivo.toFixed(0)}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                      Alocado
                    </span>
                    <span className="text-base font-bold tabular-nums">
                      {formatCompactMoney(total, moeda)}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1">
              {fatias.map(({ item, pct, cor }) => (
                <button
                  key={item.nome}
                  type="button"
                  className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    ativo === item.nome ? "bg-muted" : "hover:bg-muted/60"
                  }`}
                  onMouseEnter={() => setAtivo(item.nome)}
                  onMouseLeave={() => setAtivo(null)}
                  onClick={() => setAtivo(ativo === item.nome ? null : item.nome)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cor }}
                    />
                    <span className="truncate font-medium">{item.nome}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <span className="font-semibold">{formatMoney(item.total, moeda)}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{pct.toFixed(0)}%</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const COR_ACUMULADO = "var(--chart-1)";

/**
 * Evolução do aporte líquido acumulado — não é valor de mercado histórico
 * (brapi.dev só dá preço atual), é quanto dinheiro entrou/saiu da carteira
 * ao longo do tempo. Barras únicas em vez do par entrada/saída de
 * `GraficoFluxoMensal`, mesmo esqueleto de eixo e grid.
 */
export function GraficoAporteAcumulado({
  dados,
  moeda,
}: {
  dados: AporteMensal[];
  moeda: string;
}) {
  const [ativo, setAtivo] = useState<AporteMensal | null>(null);
  const semDados = dados.every((d) => d.acumulado === 0);
  const maior = Math.max(...dados.map((d) => d.acumulado), 1);
  const marcas = useMemo(() => [maior, Math.round(maior / 2), 0], [maior]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-base">Evolução do aporte</CardTitle>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Aporte líquido acumulado · últimos 12 meses
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {semDados ? (
          <p className="text-muted-foreground py-16 text-center text-sm">
            Sem lançamentos nesse período ainda.
          </p>
        ) : (
          <div className="relative">
            <div className="mb-3 grid grid-cols-[3.1rem_1fr] gap-2 text-[10px] text-muted-foreground">
              <div className="space-y-[3.7rem] text-right tabular-nums">
                {marcas.map((marca) => (
                  <div key={marca}>{formatEixo(marca, moeda)}</div>
                ))}
              </div>
              <div className="relative h-44 border-b border-chart-grid">
                <div className="absolute inset-x-0 top-0 border-t border-chart-grid" />
                <div className="absolute inset-x-0 top-1/2 border-t border-chart-grid" />
                <div className="absolute inset-x-0 bottom-0 grid grid-cols-12 items-end gap-1 px-1">
                  {dados.map((item) => {
                    const pct = Math.max(
                      (Math.max(item.acumulado, 0) / maior) * 100,
                      item.acumulado > 0 ? 4 : 0,
                    );
                    const selecionado = ativo?.mes === item.mes;

                    return (
                      <button
                        key={item.mes}
                        type="button"
                        className="group flex h-44 min-w-0 items-end justify-center rounded-md px-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setAtivo(selecionado ? null : item)}
                        onMouseEnter={() => setAtivo(item)}
                        onMouseLeave={() => setAtivo(null)}
                        aria-label={`${item.label}: acumulado ${formatMoney(item.acumulado, moeda)}`}
                      >
                        <span
                          className="w-full max-w-4 rounded-t-md opacity-95 group-hover:opacity-100"
                          style={{ height: `${pct}%`, backgroundColor: COR_ACUMULADO }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="ml-[3.6rem] grid grid-cols-12 gap-1 text-center text-[10px] text-muted-foreground">
              {dados.map((item) => (
                <span key={item.mes} className="truncate capitalize">
                  {item.label}
                </span>
              ))}
            </div>
            {ativo ? (
              <div className="mt-3 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm">
                <p className="mb-1 font-medium capitalize">{ativo.label}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Acumulado</span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(ativo.acumulado, moeda)}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
