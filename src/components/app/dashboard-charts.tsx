"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOEDAS, ehMoedaConhecida, formatMoney } from "@/lib/money";
import type { FatiaCategoria, FluxoMensal } from "@/lib/dashboard";

const compacto = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatEixo(cents: number, moeda: string): string {
  const simbolo = ehMoedaConhecida(moeda) ? MOEDAS[moeda].simbolo : moeda;
  return `${simbolo}${compacto.format(cents / 100)}`;
}

/**
 * Cores validadas pela skill de dataviz: azul/vermelho separam entrada e saida
 * melhor que verde/vermelho em simulacao de deuteranopia.
 */
const COR_ENTRADA = "var(--chart-1)";
const COR_SAIDA = "var(--chart-2)";

export function GraficoFluxoMensal({
  dados,
  moeda,
}: {
  dados: FluxoMensal[];
  moeda: string;
}) {
  const [ativo, setAtivo] = useState<FluxoMensal | null>(null);
  const semDados = dados.every((d) => d.entradas === 0 && d.saidas === 0);
  const maior = Math.max(...dados.flatMap((d) => [d.entradas, d.saidas]), 1);
  const marcas = useMemo(() => [maior, Math.round(maior / 2), 0], [maior]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-base">Ritmo financeiro</CardTitle>
          <p className="text-muted-foreground mt-0.5 text-xs">Ultimos 6 meses</p>
        </div>
        <div className="flex items-center gap-4 pt-2 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: COR_ENTRADA }}
            />
            <span className="text-muted-foreground">Entradas</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: COR_SAIDA }} />
            <span className="text-muted-foreground">Saidas</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {semDados ? (
          <p className="text-muted-foreground py-16 text-center text-sm">
            Sem lancamentos nesse periodo ainda.
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
                <div className="absolute inset-x-0 bottom-0 grid grid-cols-6 items-end gap-2 px-1">
                  {dados.map((item) => {
                    const entradasPct = Math.max((item.entradas / maior) * 100, item.entradas > 0 ? 4 : 0);
                    const saidasPct = Math.max((item.saidas / maior) * 100, item.saidas > 0 ? 4 : 0);
                    const selecionado = ativo?.mes === item.mes;

                    return (
                      <button
                        key={item.mes}
                        type="button"
                        className="group flex h-44 min-w-0 items-end justify-center gap-1 rounded-md px-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setAtivo(selecionado ? null : item)}
                        onMouseEnter={() => setAtivo(item)}
                        onMouseLeave={() => setAtivo(null)}
                        aria-label={`${item.label}: entradas ${formatMoney(item.entradas, moeda)}, saidas ${formatMoney(item.saidas, moeda)}`}
                      >
                        <span
                          className="w-full max-w-5 rounded-t-md opacity-95 group-hover:opacity-100"
                          style={{ height: `${entradasPct}%`, backgroundColor: COR_ENTRADA }}
                        />
                        <span
                          className="w-full max-w-5 rounded-t-md opacity-95 group-hover:opacity-100"
                          style={{ height: `${saidasPct}%`, backgroundColor: COR_SAIDA }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="ml-[3.6rem] grid grid-cols-6 gap-2 text-center text-[11px] text-muted-foreground">
              {dados.map((item) => (
                <span key={item.mes} className="truncate capitalize">{item.label}</span>
              ))}
            </div>
            {ativo ? (
              <div className="mt-3 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm">
                <p className="mb-1 font-medium capitalize">{ativo.label}</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Entradas</span>
                  <span className="font-semibold tabular-nums">{formatMoney(ativo.entradas, moeda)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Saidas</span>
                  <span className="font-semibold tabular-nums">{formatMoney(ativo.saidas, moeda)}</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function GraficoDespesasPorCategoria({
  dados,
  moeda,
}: {
  dados: FatiaCategoria[];
  moeda: string;
}) {
  const maior = Math.max(...dados.map((d) => d.total), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Para onde foi o dinheiro</CardTitle>
        <p className="text-muted-foreground text-xs">Despesas por categoria neste mes</p>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <p className="text-muted-foreground py-16 text-center text-sm">
            Nenhuma despesa neste mes ainda.
          </p>
        ) : (
          <div className="space-y-4">
            {dados.map((item) => (
              <div key={item.nome} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium"><span className="mr-1.5">{item.icone}</span>{item.nome}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatMoney(item.total, moeda)}</span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max((item.total / maior) * 100, 3)}%`,
                      backgroundColor: item.nome === "Outras" ? "var(--chart-muted)" : "var(--chart-1)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
