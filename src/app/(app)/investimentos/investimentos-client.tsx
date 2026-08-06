"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Coins, MoreVertical, Pencil, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListCard, ListRow, ListEmpty } from "@/components/app/list-card";
import { CardDestaque } from "@/components/app/card-destaque";
import { SeletorVisao, type OpcaoVisao } from "@/components/app/seletor-visao";
import { MoneyInput } from "@/components/app/money-input";
import {
  GraficoAlocacaoPorTipo,
  GraficoAporteAcumulado,
  GraficoInvestimentosMultiModo,
} from "@/components/app/investimentos-charts";
import { formatAmount, formatMoney } from "@/lib/money";
import { dataBR, hojeISO } from "@/lib/dates";
import {
  OPCOES_COMPARATIVAS,
  resolverPeriodoComparativo,
  type OpcaoComparativa,
} from "@/lib/periodo";
import {
  agregarPosicoesPorAtivo,
  projetarMediaMovel,
  TIPOS_NEGOCIAVEIS_B3,
  type AporteMensal,
  type DestaquesRentabilidade,
  type DividendoMensal,
  type FatiaAlocacao,
  type PontoPatrimonio,
  type PosicaoComMercado,
} from "@/lib/investimentos";
import type { InvestmentDividend, InvestmentHolding } from "@/lib/database.types";

import {
  arquivarHolding,
  excluirDividendo,
  excluirHolding,
  salvarDividendo,
  salvarHolding,
} from "./actions";

function formatPercentual(p: number): string {
  const sinal = p >= 0 ? "+" : "−";
  return `${sinal}${Math.abs(p * 100).toFixed(1)}%`;
}

interface TransacaoInvestimento {
  type: string;
  description: string;
  amount_primary_cents: number;
  occurred_on: string;
}

export function InvestimentosClient({
  posicoes,
  moeda,
  alocacaoPorTipo,
  destaques,
  aporteAcumulado,
  aporteMensal,
  evolucaoPatrimonial,
  dividendosMensal,
  dividendos,
  transacoesInvestimentos,
  opcoesVisao,
  visao,
  individual,
  holdings,
}: {
  posicoes: PosicaoComMercado[];
  moeda: string;
  alocacaoPorTipo: FatiaAlocacao[];
  destaques: DestaquesRentabilidade;
  aporteAcumulado: AporteMensal[];
  aporteMensal: AporteMensal[];
  evolucaoPatrimonial: PontoPatrimonio[];
  dividendosMensal: DividendoMensal[];
  dividendos: InvestmentDividend[];
  transacoesInvestimentos: TransacaoInvestimento[];
  opcoesVisao: OpcaoVisao[];
  visao: string;
  individual: boolean;
  holdings: InvestmentHolding[];
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

  const holdingsPorTicker = new Map(holdings.map((h) => [h.ticker, h]));
  const projecaoDividendos = projetarMediaMovel(dividendosMensal);

  return (
    <PageShell>
      <PageHeader
        titulo="Investimentos"
        descricao="Aporte líquido por ativo. Ações, FII e ETF ganham valor de mercado quando você informa a quantidade que tem hoje."
        acao={
          !individual && (
            <RelatorioComparativoDialog
              transacoes={transacoesInvestimentos}
              dividendos={dividendos}
              moeda={moeda}
            />
          )
        }
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

          {!individual && (
            <GraficoInvestimentosMultiModo
              evolucaoPatrimonial={evolucaoPatrimonial}
              dividendosMensal={dividendosMensal}
              projecaoDividendos={projecaoDividendos}
              aporteMensal={aporteMensal}
              moeda={moeda}
            />
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
                holding={holdingsPorTicker.get(p.ativo) ?? null}
                individual={individual}
              />
            ))}
          </ListCard>

          {!individual && (
            <DividendosCard dividendos={dividendos} moeda={moeda} tickers={posicoes.map((p) => p.ativo)} />
          )}
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
  holding,
  individual,
}: {
  posicao: PosicaoComMercado;
  moeda: string;
  pesoCarteira: number;
  holding: InvestmentHolding | null;
  individual: boolean;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [editando, setEditando] = useState(false);
  const [quantidade, setQuantidade] = useState(p.quantidade !== null ? String(p.quantidade) : "");
  const [precoMedio, setPrecoMedio] = useState(
    holding?.avg_price_cents ? formatAmount(holding.avg_price_cents) : "",
  );
  const [notas, setNotas] = useState(holding?.notes ?? "");

  const negociavel = TIPOS_NEGOCIAVEIS_B3.has(p.tipo);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await salvarHolding({
        ticker: p.ativo,
        quantity: quantidade || "0",
        avgPrice: precoMedio,
        notes: notas,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar.");
        return;
      }
      setEditando(false);
      router.refresh();
    });
  }

  function arquivar() {
    startTransition(async () => {
      const r = await arquivarHolding(p.ativo, true);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui arquivar.");
        return;
      }
      toast.success(`${p.ativo} arquivado — some da lista, sem apagar o histórico.`);
      router.refresh();
    });
  }

  function excluir() {
    startTransition(async () => {
      const r = await excluirHolding(p.ativo);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui excluir.");
        return;
      }
      toast.success("Quantidade, preço médio e notas removidos.");
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
        <div className="flex shrink-0 items-center gap-1">
          <span
            className={`text-sm font-semibold tabular-nums ${
              p.aportadoLiquido < 0 ? "text-rose-600" : ""
            }`}
          >
            {formatMoney(p.aportadoLiquido, moeda)}
          </span>
          {!individual && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <MoreVertical className="size-4" />
                  <span className="sr-only">Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditando(true)}>
                  <Pencil className="size-4" />
                  Editar ativo
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={arquivar} disabled={pendente}>
                  Arquivar (some da lista)
                </DropdownMenuItem>
                {holding && (
                  <DropdownMenuItem onSelect={excluir} disabled={pendente} variant="destructive">
                    <Trash2 className="size-4" />
                    Limpar quantidade/preço médio
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
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

      {negociavel && !editando && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
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

          {p.precoMedioBRL !== null && p.ganhoPrecoMedio !== null && (
            <span>
              Ganho vs. preço médio ({formatMoney(Math.round(p.precoMedioBRL * 100), "BRL")}):{" "}
              <span className={p.ganhoPrecoMedio >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {p.ganhoPrecoMedio >= 0 ? "+" : "−"}
                {formatMoney(Math.abs(p.ganhoPrecoMedio), moeda)}
              </span>
            </span>
          )}

          {holding?.notes && <span className="italic">{holding.notes}</span>}

          {!individual && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setEditando(true)}
            >
              <Pencil className="size-3" />
              Editar
            </Button>
          )}
        </div>
      )}

      {editando && (
        <form onSubmit={salvar} className="space-y-2 rounded-md border p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Quantidade hoje</Label>
              <Input
                autoFocus
                inputMode="decimal"
                className="h-8"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Preço médio (opcional)</Label>
              <MoneyInput value={precoMedio} onChange={setPrecoMedio} currency="BRL" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notas (opcional)</Label>
            <Input
              className="h-8"
              placeholder="Corretora, estratégia…"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={pendente}>
              Salvar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setEditando(false)}
              disabled={pendente}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function DividendosCard({
  dividendos,
  moeda,
  tickers,
}: {
  dividendos: InvestmentDividend[];
  moeda: string;
  tickers: string[];
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [ticker, setTicker] = useState(tickers[0] ?? "");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [notas, setNotas] = useState("");

  const ordenados = [...dividendos].sort((a, b) => b.paid_on.localeCompare(a.paid_on));

  function abrirNovo() {
    setTicker(tickers[0] ?? "");
    setValor("");
    setData(hojeISO());
    setNotas("");
    setDialogAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await salvarDividendo({ ticker, amount: valor, paid_on: data, notes: notas });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar.");
        return;
      }
      toast.success("Dividendo registrado.");
      setDialogAberto(false);
      router.refresh();
    });
  }

  function excluir(id: string) {
    startTransition(async () => {
      const r = await excluirDividendo(id);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui excluir.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Coins className="size-4" />
            Dividendos recebidos
          </p>
          <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={abrirNovo}>
                <Plus className="size-4" />
                Registrar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar dividendo</DialogTitle>
              </DialogHeader>
              <form onSubmit={salvar} className="space-y-4">
                <div className="space-y-2">
                  <Label>Ticker</Label>
                  <Input
                    placeholder="CASH3, CPTS11…"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                  />
                </div>
                <MoneyInput label="Valor recebido" value={valor} onChange={setValor} currency={moeda} required />
                <div className="space-y-2">
                  <Label htmlFor="data-dividendo">Data</Label>
                  <Input
                    id="data-dividendo"
                    type="date"
                    required
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Input value={notas} onChange={(e) => setNotas(e.target.value)} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={pendente || !ticker.trim()}>
                    {pendente ? "Salvando…" : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {ordenados.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            Nenhum dividendo registrado ainda — o extrato não identifica dividendo com
            segurança, então é melhor registrar na mão.
          </p>
        ) : (
          <div className="divide-border/70 divide-y">
            {ordenados.slice(0, 8).map((d) => (
              <ListRow key={d.id} className="px-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {d.ticker}
                    {d.notes && <span className="text-muted-foreground"> · {d.notes}</span>}
                  </p>
                  <p className="text-muted-foreground text-xs">{dataBR(d.paid_on)}</p>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums text-emerald-600">
                  +{formatMoney(d.amount_cents, moeda)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => excluir(d.id)}
                  disabled={pendente}
                  aria-label="Excluir"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </ListRow>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RelatorioComparativoDialog({
  transacoes,
  dividendos,
  moeda,
}: {
  transacoes: TransacaoInvestimento[];
  dividendos: InvestmentDividend[];
  moeda: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [opcaoA, setOpcaoA] = useState<OpcaoComparativa>("mes-atual");
  const [opcaoB, setOpcaoB] = useState<OpcaoComparativa>("mes-anterior");

  const hoje = hojeISO();

  const resumoDoPeriodo = useCallback(
    (opcao: OpcaoComparativa) => {
      const { de, ateExclusivo, label } = resolverPeriodoComparativo(opcao, hoje);
      const transacoesDoPeriodo = transacoes.filter(
        (t) => t.occurred_on >= de && t.occurred_on < ateExclusivo,
      );
      const posicoes = agregarPosicoesPorAtivo(transacoesDoPeriodo);
      const aportado = posicoes.reduce((acc, p) => acc + p.totalAportado, 0);
      const resgatado = posicoes.reduce((acc, p) => acc + p.totalResgatado, 0);
      const dividendosDoPeriodo = dividendos
        .filter((d) => d.paid_on >= de && d.paid_on < ateExclusivo)
        .reduce((acc, d) => acc + d.amount_cents, 0);
      return { label, aportado, resgatado, dividendosDoPeriodo };
    },
    [transacoes, dividendos, hoje],
  );

  const resumoA = useMemo(() => resumoDoPeriodo(opcaoA), [opcaoA, resumoDoPeriodo]);
  const resumoB = useMemo(() => resumoDoPeriodo(opcaoB), [opcaoB, resumoDoPeriodo]);

  function linha(rotulo: string, a: number, b: number) {
    const diff = a - b;
    return (
      <div className="grid grid-cols-3 items-center gap-2 py-1.5 text-sm">
        <span className="text-muted-foreground">{rotulo}</span>
        <span className="text-right font-medium tabular-nums">{formatMoney(a, moeda)}</span>
        <span
          className={`text-right text-xs tabular-nums ${diff >= 0 ? "text-emerald-600" : "text-rose-600"}`}
        >
          vs {formatMoney(b, moeda)} ({diff >= 0 ? "+" : "−"}
          {formatMoney(Math.abs(diff), moeda)})
        </span>
      </div>
    );
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BarChart3 className="size-4" />
          Relatório
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comparar períodos</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <Select value={opcaoA} onValueChange={(v) => setOpcaoA(v as OpcaoComparativa)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPCOES_COMPARATIVAS.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={opcaoB} onValueChange={(v) => setOpcaoB(v as OpcaoComparativa)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPCOES_COMPARATIVAS.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="divide-border/70 divide-y">
          <p className="text-muted-foreground pt-1 text-xs">
            {resumoA.label} vs. {resumoB.label}
          </p>
          {linha("Aportado", resumoA.aportado, resumoB.aportado)}
          {linha("Resgatado", resumoA.resgatado, resumoB.resgatado)}
          {linha("Dividendos", resumoA.dividendosDoPeriodo, resumoB.dividendosDoPeriodo)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
