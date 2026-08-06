"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactMoney, formatMoney } from "@/lib/money";
import { diaMes } from "@/lib/dates";
import type { ItemExtratoPrevisao, RecorrenciaBase } from "@/lib/fixas";

interface PontoGrafico {
  vencimento: string;
  label: string;
  descricao: string;
  saldo: number;
}

/**
 * Trajetória do saldo projetado a cada vencimento que ainda falta este mês —
 * mesmo padrão manual de barra com linha de base em zero de
 * `GraficoInvestimentosMultiModo` (`investimentos-charts.tsx`), adaptado pra
 * eixo X por data de vencimento em vez de mês.
 */
export function GraficoPrevisaoSaldo<T extends RecorrenciaBase & { description: string }>({
  itens,
  moeda,
}: {
  itens: ItemExtratoPrevisao<T>[];
  moeda: string;
}) {
  const [ativo, setAtivo] = useState<PontoGrafico | null>(null);

  const dados: PontoGrafico[] = useMemo(
    () =>
      itens.map((item) => ({
        vencimento: item.vencimento,
        label: diaMes(item.vencimento),
        descricao: item.recorrencia.description,
        saldo: item.saldoProjetadoApos,
      })),
    [itens],
  );

  if (dados.length === 0) {
    return null;
  }

  const maiorPositivo = Math.max(...dados.map((d) => d.saldo), 1);
  const menorNegativo = Math.min(...dados.map((d) => d.saldo), 0);
  const amplitude = maiorPositivo - menorNegativo || 1;
  const linhaZeroPct = (maiorPositivo / amplitude) * 100;

  function alturaBarra(saldo: number): { topo: number; altura: number } {
    if (saldo >= 0) {
      const altura = Math.max((saldo / amplitude) * 100, 3);
      return { topo: linhaZeroPct - altura, altura };
    }
    const altura = Math.max((Math.abs(saldo) / amplitude) * 100, 3);
    return { topo: linhaZeroPct, altura };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trajetória do saldo</CardTitle>
        <p className="text-muted-foreground text-xs">
          Saldo projetado depois de cada vencimento que ainda falta este mês
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="relative h-40 border-b border-chart-grid">
            <div className="absolute inset-x-0 top-0 border-t border-chart-grid" />
            {menorNegativo < 0 && (
              <div
                className="absolute inset-x-0 border-t border-dashed border-chart-grid"
                style={{ bottom: `${linhaZeroPct}%` }}
              />
            )}
            <div className="absolute inset-x-0 bottom-0 flex h-full items-stretch gap-1.5 px-1">
              {dados.map((item) => {
                const { topo, altura } = alturaBarra(item.saldo);
                const selecionado = ativo?.vencimento === item.vencimento;
                return (
                  <button
                    key={item.vencimento}
                    type="button"
                    className="group relative flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setAtivo(selecionado ? null : item)}
                    onMouseEnter={() => setAtivo(item)}
                    onMouseLeave={() => setAtivo(null)}
                    aria-label={`${item.label} · ${item.descricao}: saldo projetado ${formatMoney(item.saldo, moeda)}`}
                  >
                    <span
                      className="absolute w-full rounded-sm opacity-95 group-hover:opacity-100"
                      style={{
                        top: `${topo}%`,
                        height: `${altura}%`,
                        backgroundColor: item.saldo < 0 ? "var(--status-critical)" : "var(--chart-1)",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-2 flex gap-1.5 px-1 text-center text-[10px] text-muted-foreground">
            {dados.map((item) => (
              <span key={item.vencimento} className="flex-1 truncate">
                {item.label}
              </span>
            ))}
          </div>
          {ativo ? (
            <div className="mt-3 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm">
              <p className="mb-1 font-medium">
                {ativo.label} · {ativo.descricao}
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Saldo projetado depois</span>
                <span className="font-semibold tabular-nums">{formatMoney(ativo.saldo, moeda)}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground mt-3 text-center text-[11px]">
              Passa o mouse ou toca numa barra pra ver o detalhe ·{" "}
              {formatCompactMoney(dados[dados.length - 1].saldo, moeda)} no fim
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
