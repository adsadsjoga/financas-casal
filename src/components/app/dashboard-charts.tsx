"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOEDAS, ehMoedaConhecida, formatCompactMoney, formatMoney } from "@/lib/money";
import { corFatia } from "@/lib/dashboard";
import type { FatiaCategoria, FluxoMensal, GastoPessoa } from "@/lib/dashboard";

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

/**
 * Donut de despesas por categoria.
 *
 * Desenhado com `stroke-dasharray` sobre um circulo com `pathLength="100"`:
 * assim cada fatia e literalmente a sua porcentagem, sem calcular arco nem
 * trigonometria. O `-25` no offset gira o inicio para as 12 horas.
 */
export function GraficoDespesasPorCategoria({
  dados,
  moeda,
}: {
  dados: FatiaCategoria[];
  moeda: string;
}) {
  const [ativo, setAtivo] = useState<string | null>(null);
  const total = dados.reduce((acc, d) => acc + d.total, 0);

  const fatias = useMemo(() => {
    const pcts = dados.map((item) => (total > 0 ? (item.total / total) * 100 : 0));
    // Soma de prefixo: onde cada fatia comeca no anel. O `-25` gira o inicio
    // para as 12 horas, ja que o SVG comeca as 3.
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
        <CardTitle className="text-base">Para onde foi o dinheiro</CardTitle>
        <p className="text-muted-foreground text-xs">Despesas por categoria neste mes</p>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <p className="text-muted-foreground py-16 text-center text-sm">
            Nenhuma despesa neste mes ainda.
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
                    <span className="text-xl">{itemAtivo.icone}</span>
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
                      Total
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
                    <span className="truncate font-medium">
                      <span className="mr-1.5">{item.icone}</span>
                      {item.nome}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <span className="font-semibold">{formatMoney(item.total, moeda)}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {pct.toFixed(0)}%
                    </span>
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

const COR_PESSOA = ["var(--chart-pessoa-1)", "var(--chart-pessoa-2)"];

/**
 * Quanto cada pessoa pagou no periodo. Barra pareada em vez de pizza: duas
 * series comparam melhor em comprimento do que em angulo.
 */
export function GraficoGastosPorPessoa({
  dados,
  moeda,
  legenda = "Por quem pagou, neste mes",
  vazio = "Nenhuma despesa neste mes ainda.",
}: {
  dados: GastoPessoa[];
  moeda: string;
  /** Ex.: "Por quem pagou, nesta viagem" — Home usa o padrão mensal. */
  legenda?: string;
  vazio?: string;
}) {
  const maior = Math.max(...dados.map((d) => d.total), 1);
  const total = dados.reduce((acc, d) => acc + d.total, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quem gastou quanto</CardTitle>
        <p className="text-muted-foreground text-xs">{legenda}</p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">{vazio}</p>
        ) : (
          <div className="space-y-4">
            {dados.map((pessoa, i) => {
              const pct = total > 0 ? (pessoa.total / total) * 100 : 0;
              const cor =
                pessoa.profileId === null
                  ? "var(--chart-muted)"
                  : COR_PESSOA[i % COR_PESSOA.length];
              return (
                <div key={pessoa.profileId ?? "sem-responsavel"} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5 truncate font-medium">
                      <span>{pessoa.icone}</span>
                      {pessoa.nome}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      <span className="font-semibold">{formatMoney(pessoa.total, moeda)}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {pct.toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pessoa.total > 0 ? Math.max((pessoa.total / maior) * 100, 3) : 0}%`,
                        backgroundColor: cor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
