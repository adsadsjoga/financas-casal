"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListCard, ListEmpty } from "@/components/app/list-card";
import { CardDestaque } from "@/components/app/card-destaque";
import { SeletorVisao, type OpcaoVisao } from "@/components/app/seletor-visao";
import {
  GraficoAlocacaoPorTipo,
  GraficoAporteAcumulado,
} from "@/components/app/investimentos-charts";
import { formatMoney } from "@/lib/money";
import {
  TIPOS_NEGOCIAVEIS_B3,
  type AporteMensal,
  type DestaquesRentabilidade,
  type FatiaAlocacao,
  type PosicaoComMercado,
} from "@/lib/investimentos";

import { salvarQuantidadeAtivo } from "./actions";

function formatPercentual(p: number): string {
  const sinal = p >= 0 ? "+" : "−";
  return `${sinal}${Math.abs(p * 100).toFixed(1)}%`;
}

export function InvestimentosClient({
  posicoes,
  moeda,
  alocacaoPorTipo,
  destaques,
  aporteAcumulado,
  opcoesVisao,
  visao,
  individual,
}: {
  posicoes: PosicaoComMercado[];
  moeda: string;
  alocacaoPorTipo: FatiaAlocacao[];
  destaques: DestaquesRentabilidade;
  aporteAcumulado: AporteMensal[];
  opcoesVisao: OpcaoVisao[];
  visao: string;
  individual: boolean;
}) {
  const totalAportado = posicoes.reduce((acc, p) => acc + p.aportadoLiquido, 0);
  const comValorDeMercado = posicoes.filter((p) => p.valorMercado !== null);
  const totalMercado = comValorDeMercado.reduce((acc, p) => acc + (p.valorMercado ?? 0), 0);
  const totalAportadoDosQueTemMercado = comValorDeMercado.reduce(
    (acc, p) => acc + p.aportadoLiquido,
    0,
  );
  const ganhoTotal = totalMercado - totalAportadoDosQueTemMercado;

  // Peso de cada ativo na carteira, para a barra na lista — mesma base do
  // donut (valor de mercado quando existe, aportado como proxy senão).
  const totalCarteira = posicoes.reduce(
    (acc, p) => acc + Math.max(p.valorMercado ?? p.aportadoLiquido, 0),
    0,
  );

  return (
    <PageShell>
      <PageHeader
        titulo="Investimentos"
        descricao="Aporte líquido por ativo. Ações, FII e ETF ganham valor de mercado quando você informa a quantidade que tem hoje."
      />

      {opcoesVisao.length > 0 && (
        <SeletorVisao opcoes={opcoesVisao} atual={visao} basePath="/investimentos" />
      )}

      {posicoes.length === 0 ? (
        <ListEmpty
          icone={<TrendingUp className="size-6" />}
          titulo="Nenhum investimento lançado ainda"
          descricao='Aparece aqui automaticamente quando uma transação usa a categoria "Investimentos".'
        />
      ) : (
        <>
          <CardDestaque rotulo="Total aportado líquido" valor={formatMoney(totalAportado, moeda)}>
            {comValorDeMercado.length > 0 && (
              <div className="flex items-center justify-between rounded-md bg-black/10 px-3 py-2 text-xs">
                <span className="text-primary-foreground/65">
                  Valor de mercado (dos {comValorDeMercado.length} com quantidade informada)
                </span>
                <span className="font-bold tabular-nums">
                  {formatMoney(totalMercado, moeda)}
                  <span className={ganhoTotal >= 0 ? "text-emerald-300" : "text-rose-300"}>
                    {" "}
                    ({ganhoTotal >= 0 ? "+" : "−"}
                    {formatMoney(Math.abs(ganhoTotal), moeda)}
                    {destaques.retornoTotalPercentual !== null &&
                      ` · ${formatPercentual(destaques.retornoTotalPercentual)}`}
                    )
                  </span>
                </span>
              </div>
            )}
            <p className="text-primary-foreground/60 text-xs">
              {individual
                ? "Cotas e ações são do casal, sem dono único — valor de mercado só aparece na visão Casal."
                : "Renda fixa (RDB, Tesouro) e ativos sem preço público continuam só no aporte — sem valor de mercado embutido na soma."}
            </p>
          </CardDestaque>

          {(destaques.melhor || destaques.pior) && (
            <div className="grid grid-cols-2 gap-3">
              {destaques.melhor && (
                <CardDestaqueMini
                  rotulo="Maior alta"
                  ativo={destaques.melhor.ativo}
                  percentual={destaques.melhor.percentual}
                  cor="emerald"
                />
              )}
              {destaques.pior && (
                <CardDestaqueMini
                  rotulo="Maior queda"
                  ativo={destaques.pior.ativo}
                  percentual={destaques.pior.percentual}
                  cor="rose"
                />
              )}
            </div>
          )}

          <GraficoAlocacaoPorTipo dados={alocacaoPorTipo} moeda={moeda} />

          <GraficoAporteAcumulado dados={aporteAcumulado} moeda={moeda} />

          <ListCard>
            {posicoes.map((p) => (
              <LinhaAtivo
                key={p.ativo}
                posicao={p}
                moeda={moeda}
                pesoCarteira={
                  totalCarteira > 0
                    ? Math.max(p.valorMercado ?? p.aportadoLiquido, 0) / totalCarteira
                    : 0
                }
              />
            ))}
          </ListCard>
        </>
      )}
    </PageShell>
  );
}

function CardDestaqueMini({
  rotulo,
  ativo,
  percentual,
  cor,
}: {
  rotulo: string;
  ativo: string;
  percentual: number;
  cor: "emerald" | "rose";
}) {
  const Icone = cor === "emerald" ? TrendingUp : TrendingDown;
  return (
    <Card>
      <CardContent className="space-y-1.5">
        <p className="text-muted-foreground flex items-center gap-1 text-xs font-semibold tracking-wide uppercase">
          <Icone className={`size-3.5 ${cor === "emerald" ? "text-emerald-600" : "text-rose-600"}`} />
          {rotulo}
        </p>
        <p className="truncate text-sm font-medium">{ativo}</p>
        <p
          className={`text-lg font-bold tabular-nums ${
            cor === "emerald" ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {formatPercentual(percentual)}
        </p>
      </CardContent>
    </Card>
  );
}

function LinhaAtivo({
  posicao: p,
  moeda,
  pesoCarteira,
}: {
  posicao: PosicaoComMercado;
  moeda: string;
  pesoCarteira: number;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [quantidade, setQuantidade] = useState(p.quantidade !== null ? String(p.quantidade) : "");

  const negociavel = TIPOS_NEGOCIAVEIS_B3.has(p.tipo);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await salvarQuantidadeAtivo(p.ativo, quantidade);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar.");
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  // Linha com layout vertical (cabeçalho + detalhes que quebram linha) —
  // não usa <ListRow> porque esse é horizontal/centralizado por padrão.
  return (
    <div className="space-y-2 px-(--card-spacing) py-3">
      <div className="flex items-center justify-between gap-3">
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

      {pesoCarteira > 0 && (
        <div className="flex items-center gap-2">
          <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
            <div
              className="bg-foreground/40 h-full rounded-full"
              style={{ width: `${Math.max(pesoCarteira * 100, 2)}%` }}
            />
          </div>
          <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
            {(pesoCarteira * 100).toFixed(0)}% da carteira
          </span>
        </div>
      )}

      {negociavel && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {editando ? (
            <form onSubmit={salvar} className="flex items-center gap-2">
              <span>Quantidade que você tem hoje:</span>
              <Input
                autoFocus
                inputMode="decimal"
                className="h-7 w-24"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
              <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={pendente}>
                Salvar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setEditando(false)}
              >
                Cancelar
              </Button>
            </form>
          ) : (
            <>
              {p.quantidade !== null ? (
                <span>
                  {p.quantidade} cotas/ações
                  {p.precoAtualBRL !== null &&
                    ` · preço hoje ${formatMoney(Math.round(p.precoAtualBRL * 100), "BRL")}`}
                </span>
              ) : (
                <span>Sem quantidade informada</span>
              )}

              {p.valorMercado !== null && (
                <span>
                  Valor de mercado{" "}
                  <span className="text-foreground font-medium tabular-nums">
                    {formatMoney(p.valorMercado, moeda)}
                  </span>
                  {p.ganhoLiquido !== null && (
                    <span className={p.ganhoLiquido >= 0 ? "text-emerald-600" : "text-rose-600"}>
                      {" "}
                      ({p.ganhoLiquido >= 0 ? "+" : "−"}
                      {formatMoney(Math.abs(p.ganhoLiquido), moeda)}
                      {p.aportadoLiquido > 0 &&
                        ` · ${formatPercentual(p.ganhoLiquido / p.aportadoLiquido)}`}
                      )
                    </span>
                  )}
                </span>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setEditando(true)}
              >
                <Pencil className="size-3" />
                {p.quantidade !== null ? "Editar quantidade" : "Informar quantidade"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

