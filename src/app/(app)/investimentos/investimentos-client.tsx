"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListCard, ListEmpty } from "@/components/app/list-card";
import { CardDestaque } from "@/components/app/card-destaque";
import { formatMoney } from "@/lib/money";
import { TIPOS_NEGOCIAVEIS_B3, type PosicaoComMercado } from "@/lib/investimentos";

import { salvarQuantidadeAtivo } from "./actions";

export function InvestimentosClient({
  posicoes,
  moeda,
}: {
  posicoes: PosicaoComMercado[];
  moeda: string;
}) {
  const totalAportado = posicoes.reduce((acc, p) => acc + p.aportadoLiquido, 0);
  const comValorDeMercado = posicoes.filter((p) => p.valorMercado !== null);
  const totalMercado = comValorDeMercado.reduce((acc, p) => acc + (p.valorMercado ?? 0), 0);
  const totalAportadoDosQueTemMercado = comValorDeMercado.reduce(
    (acc, p) => acc + p.aportadoLiquido,
    0,
  );
  const ganhoTotal = totalMercado - totalAportadoDosQueTemMercado;

  return (
    <PageShell>
      <PageHeader
        titulo="Investimentos"
        descricao="Aporte líquido por ativo. Ações, FII e ETF ganham valor de mercado quando você informa a quantidade que tem hoje."
      />

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
                    {formatMoney(Math.abs(ganhoTotal), moeda)})
                  </span>
                </span>
              </div>
            )}
            <p className="text-primary-foreground/60 text-xs">
              Renda fixa (RDB, Tesouro) e ativos sem preço público continuam
              só no aporte — sem valor de mercado embutido na soma.
            </p>
          </CardDestaque>

          <ListCard>
            {posicoes.map((p) => (
              <LinhaAtivo key={p.ativo} posicao={p} moeda={moeda} />
            ))}
          </ListCard>
        </>
      )}
    </PageShell>
  );
}

function LinhaAtivo({ posicao: p, moeda }: { posicao: PosicaoComMercado; moeda: string }) {
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
                      {formatMoney(Math.abs(p.ganhoLiquido), moeda)})
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

