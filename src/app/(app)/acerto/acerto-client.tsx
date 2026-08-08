"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, HandCoins, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListRow } from "@/components/app/list-card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyInput } from "@/components/app/money-input";
import { formatAmount, formatMoney, parseBRL } from "@/lib/money";
import {
  addDias,
  addMeses,
  dataBR,
  hojeISO,
  inicioDoMesSeguinte,
  nomeDoMes,
  primeiroDiaDoMes,
} from "@/lib/dates";
import { type ModoPeriodo, type Periodo } from "@/lib/periodo";
import { cn } from "@/lib/utils";
import {
  agruparSaldoPorCategoria,
  calcularSaldoAcerto,
  filtrarSettlements,
  sugerirTransacoesParecidas,
  type TransacaoParaSugestao,
} from "@/lib/splits";
import type {
  Category,
  Profile,
  Settlement,
  SettlementItem,
  SplitLedgerRow,
} from "@/lib/database.types";

import {
  desfazerAcerto,
  desvincularPagamentoDivisao,
  registrarAcerto,
  vincularPagamentoDivisao,
} from "./actions";

const ROTULO_TIPO: Record<string, string> = {
  receita: "entrada",
  despesa: "saída",
  transferencia: "transferência",
};

export function AcertoClient({
  ledger,
  ledgerPeriodo,
  settlements,
  settlementItems,
  categorias,
  eu,
  parceiro,
  moedaCasal,
  contas,
  transacoesDoMes,
  transacoesDoPeriodo,
  transacoesVinculadas,
  periodo,
}: {
  ledger: SplitLedgerRow[];
  /** Mesmo split_ledger, mas só do período selecionado no seletor do card "Lançamentos divididos". */
  ledgerPeriodo: SplitLedgerRow[];
  settlements: Settlement[];
  settlementItems: Array<
    SettlementItem & {
      settlement: Pick<Settlement, "from_profile" | "to_profile" | "transaction_id"> | null;
    }
  >;
  categorias: Pick<Category, "id" | "name" | "icon">[];
  eu: Profile;
  parceiro: Profile;
  moedaCasal: string;
  contas: Array<{ id: string; name: string }>;
  transacoesDoMes: TransacaoParaSugestao[];
  /** Mesma janela do seletor de período no topo — candidatos pra "Vincular pagamento". */
  transacoesDoPeriodo: TransacaoParaSugestao[];
  /** transaction_id -> descrição/data/conta, pra mostrar histórico e despesas divididas já vinculadas. */
  transacoesVinculadas: Record<string, { description: string; occurred_on: string; account_id?: string }>;
  periodo: Periodo;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [valor, setValor] = useState("");
  const [nota, setNota] = useState("");
  const [transacaoVinculada, setTransacaoVinculada] = useState<string | null>(null);
  const [buscaHistorico, setBuscaHistorico] = useState("");

  const [linkingRow, setLinkingRow] = useState<SplitLedgerRow | null>(null);
  const [valorVincular, setValorVincular] = useState("");
  const [transferenciaEscolhida, setTransferenciaEscolhida] = useState<string | null>(null);

  // Positivo: parceiro deve para mim. Negativo: eu devo para o parceiro.
  const saldo = calcularSaldoAcerto(ledger, settlements, eu.id, parceiro.id);
  const quitado = saldo === 0;
  const parceiroDeve = saldo > 0;
  const valorAbs = Math.abs(saldo);

  const devedor = parceiroDeve ? parceiro : eu;
  const credor = parceiroDeve ? eu : parceiro;

  // Saldo só do mês atual (sem descontar acertos já feitos) — base dos
  // atalhos "metade do mês"/"mês inteiro": quando a divisão não bateu (ex.
  // o outro pagou a Vodafone mas não registrou), esses dois valores cobrem
  // o caso mais comum sem precisar somar nada na mão.
  const mesAtual = primeiroDiaDoMes(hojeISO());
  const proximoMes = inicioDoMesSeguinte(mesAtual);
  const ledgerDoMes = ledger.filter(
    (l) => l.occurred_on >= mesAtual && l.occurred_on < proximoMes,
  );
  const saldoMesAbs = Math.abs(
    calcularSaldoAcerto(ledgerDoMes, [], eu.id, parceiro.id),
  );

  const contasPorId = new Map(contas.map((c) => [c.id, c.name]));
  const categoriasPorId = new Map(categorias.map((c) => [c.id, c]));
  const candidatos = useMemo(() => {
    const cents = parseBRL(valor);
    return cents ? sugerirTransacoesParecidas(transacoesDoMes, cents) : [];
  }, [valor, transacoesDoMes]);

  // Quanto já foi vinculado a cada despesa dividida, por par pagador/devedor
  // -- chave composta porque `settlement_items` não guarda o devedor
  // diretamente, só via o settlement.
  const pagoPorItem = useMemo(() => {
    const mapa = new Map<
      string,
      { total: number; vinculos: Array<{ itemId: string; transferId: string | null; amount: number }> }
    >();
    for (const item of settlementItems) {
      if (!item.settlement) continue;
      const chave = `${item.expense_transaction_id}|${item.settlement.from_profile}|${item.settlement.to_profile}`;
      const atual = mapa.get(chave) ?? { total: 0, vinculos: [] };
      atual.total += item.amount_cents;
      atual.vinculos.push({
        itemId: item.id,
        transferId: item.settlement.transaction_id,
        amount: item.amount_cents,
      });
      mapa.set(chave, atual);
    }
    return mapa;
  }, [settlementItems]);

  const candidatosVincular = useMemo(() => {
    const cents = parseBRL(valorVincular);
    return linkingRow && cents
      ? sugerirTransacoesParecidas(transacoesDoPeriodo, cents)
      : [];
  }, [valorVincular, transacoesDoPeriodo, linkingRow]);

  function irParaPeriodo(novo: { modo?: ModoPeriodo; mes?: string; ano?: string; dia?: string }) {
    const modoFinal = novo.modo ?? periodo.modo;
    const params = new URLSearchParams({ modo: modoFinal });
    if (modoFinal === "mes") params.set("mes", novo.mes ?? periodo.referencia);
    if (modoFinal === "ano") params.set("ano", novo.ano ?? periodo.referencia);
    if (modoFinal === "dia") params.set("dia", novo.dia ?? periodo.referencia);
    router.push(`/acerto?${params.toString()}`);
  }

  function navegarPeriodo(delta: 1 | -1) {
    if (periodo.modo === "ano") {
      irParaPeriodo({ ano: String(Number(periodo.referencia) + delta) });
    } else if (periodo.modo === "dia") {
      irParaPeriodo({ dia: addDias(periodo.referencia, delta) });
    } else {
      irParaPeriodo({ mes: addMeses(periodo.referencia, delta) });
    }
  }

  function abrirVincular(l: SplitLedgerRow, restanteCents: number) {
    setLinkingRow(l);
    setValorVincular(formatAmount(restanteCents));
    setTransferenciaEscolhida(null);
  }

  function confirmarVincular(e: React.FormEvent) {
    e.preventDefault();
    if (!linkingRow) return;
    if (!transferenciaEscolhida) {
      toast.error("Escolha uma transferência.");
      return;
    }
    const cents = parseBRL(valorVincular);
    if (cents === null || cents <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    startTransition(async () => {
      const r = await vincularPagamentoDivisao({
        expenseTransactionId: linkingRow.transaction_id,
        debtorProfileId: linkingRow.debtor_profile_id,
        payerProfileId: linkingRow.payer_profile_id,
        amountCents: cents,
        transferTransactionId: transferenciaEscolhida,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui vincular.");
        return;
      }
      toast.success("Pagamento vinculado.");
      setLinkingRow(null);
      router.refresh();
    });
  }

  function desvincularItem(itemId: string) {
    startTransition(async () => {
      const r = await desvincularPagamentoDivisao(itemId);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui desvincular.");
        return;
      }
      toast.success("Vínculo removido.");
      router.refresh();
    });
  }

  function abrirAcerto() {
    setValor(valorAbs > 0 ? formatAmount(valorAbs) : "");
    setNota("");
    setTransacaoVinculada(null);
    setDialogAberto(true);
  }

  function escolherCandidato(c: TransacaoParaSugestao) {
    setTransacaoVinculada((atual) => (atual === c.id ? null : c.id));
    setNota(
      `${c.description || ROTULO_TIPO[c.type]} · ${contasPorId.get(c.account_id) ?? ""} · ${dataBR(c.occurred_on)}`,
    );
  }

  function confirmarAcerto(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseBRL(valor);
    if (cents === null || cents <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    startTransition(async () => {
      const r = await registrarAcerto(devedor.id, credor.id, cents, nota, transacaoVinculada);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui registrar.");
        return;
      }
      toast.success("Acerto registrado.");
      setDialogAberto(false);
      router.refresh();
    });
  }

  function desfazer(id: string) {
    startTransition(async () => {
      const r = await desfazerAcerto(id);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui desfazer.");
        return;
      }
      toast.success("Acerto desfeito.");
      router.refresh();
    });
  }

  const historico = useMemo(
    () =>
      filtrarSettlements(settlements, { termo: buscaHistorico }).sort((a, b) =>
        b.settled_on.localeCompare(a.settled_on),
      ),
    [settlements, buscaHistorico],
  );

  const origens = useMemo(
    () => agruparSaldoPorCategoria(ledger, categorias, eu.id, parceiro.id),
    [ledger, categorias, eu.id, parceiro.id],
  );
  const maiorOrigem = Math.max(...origens.map((o) => Math.abs(o.saldo)), 1);

  return (
    <PageShell>
      <PageHeader
        titulo="Acerto de contas"
        descricao="Só o que foi marcado como dividido entra aqui."
      />

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          {quitado ? (
            <>
              <div className="text-4xl">✅</div>
              <p className="text-lg font-medium">Está tudo acertado</p>
              <p className="text-muted-foreground text-sm">
                Nenhuma pendência entre {eu.display_name} e{" "}
                {parceiro.display_name}.
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl">{devedor.avatar_emoji}</div>
              <p className="text-lg">
                <span className="font-semibold">{devedor.display_name}</span>{" "}
                deve{" "}
                <span className="font-semibold tabular-nums">
                  {formatMoney(valorAbs, moedaCasal)}
                </span>{" "}
                para{" "}
                <span className="font-semibold">{credor.display_name}</span>
              </p>
              <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
                <DialogTrigger asChild>
                  <Button onClick={abrirAcerto}>
                    <HandCoins className="size-4" />
                    Marcar como acertado
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar acerto</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={confirmarAcerto} className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                      {devedor.display_name} → {credor.display_name}
                    </p>
                    <MoneyInput
                      label="Valor pago"
                      value={valor}
                      onChange={setValor}
                      currency={moedaCasal}
                    />
                    {saldoMesAbs > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground text-xs">Atalhos deste mês:</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setValor(formatAmount(Math.round(saldoMesAbs / 2)))}
                        >
                          Metade ({formatMoney(Math.round(saldoMesAbs / 2), moedaCasal)})
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setValor(formatAmount(saldoMesAbs))}
                        >
                          Mês inteiro ({formatMoney(saldoMesAbs, moedaCasal)})
                        </Button>
                      </div>
                    )}
                    {candidatos.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-muted-foreground text-xs">
                          Pode ser um desses lançamentos seus deste mês:
                        </span>
                        <div className="space-y-1">
                          {candidatos.map((c) => {
                            const selecionado = transacaoVinculada === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => escolherCandidato(c)}
                                className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors ${
                                  selecionado
                                    ? "border-primary bg-secondary"
                                    : "hover:bg-muted"
                                }`}
                              >
                                <span className="min-w-0 flex-1 truncate">
                                  {selecionado && "✓ "}
                                  {c.description || ROTULO_TIPO[c.type]}
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {contasPorId.get(c.account_id) ?? "conta"} · {dataBR(c.occurred_on)}
                                  </span>
                                </span>
                                <span className="shrink-0 font-medium tabular-nums">
                                  {formatMoney(c.amount_cents, moedaCasal)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          {transacaoVinculada
                            ? "Selecionado — esse acerto vai ficar referenciando esse lançamento."
                            : "Clique numa pra vincular esse acerto a ela (preenche a nota e guarda a referência)."}
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="nota-acerto">Nota (opcional)</Label>
                      <Input
                        id="nota-acerto"
                        placeholder="Pix, dinheiro…"
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={pendente}>
                        {pendente ? "Salvando…" : "Confirmar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardContent>
      </Card>

      {origens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              De onde vem essa diferença
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              Composição das despesas divididas. Não desconta os acertos já
              feitos — acerto não tem categoria para abater.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {origens.slice(0, 5).map((o) => {
              const aFavorDeMim = o.saldo > 0;
              return (
                <div
                  key={o.categoryId ?? "sem-categoria"}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="mr-1.5">{o.icone}</span>
                      {o.nome}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {aFavorDeMim ? parceiro.display_name : eu.display_name}{" "}
                      deve{" "}
                      <span className="text-foreground font-semibold">
                        {formatMoney(Math.abs(o.saldo), moedaCasal)}
                      </span>
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max((Math.abs(o.saldo) / maiorOrigem) * 100, 3)}%`,
                        backgroundColor: aFavorDeMim
                          ? "var(--chart-pessoa-1)"
                          : "var(--chart-pessoa-2)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Lançamentos divididos</CardTitle>
            <div className="flex items-center gap-1">
              <Select
                value={periodo.modo}
                onValueChange={(v) => irParaPeriodo({ modo: v as ModoPeriodo })}
              >
                <SelectTrigger className="h-7 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes">Mês</SelectItem>
                  <SelectItem value="ano">Ano</SelectItem>
                  <SelectItem value="dia">Dia</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => navegarPeriodo(-1)}
                aria-label="Período anterior"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="w-24 text-center text-xs tabular-nums">
                {periodo.modo === "ano"
                  ? periodo.referencia
                  : periodo.modo === "dia"
                    ? dataBR(periodo.referencia)
                    : nomeDoMes(periodo.referencia)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => navegarPeriodo(1)}
                aria-label="Próximo período"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Cada despesa dividida nesse período, e se a parte do outro já foi
            paga por uma transferência real.
          </p>
        </CardHeader>
        <CardContent className="divide-border/70 divide-y p-0">
          {ledgerPeriodo.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
              Nenhuma despesa dividida nesse período.
            </p>
          ) : (
            [...ledgerPeriodo]
              .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
              .map((l) => {
                const chave = `${l.transaction_id}|${l.debtor_profile_id}|${l.payer_profile_id}`;
                const pago = pagoPorItem.get(chave);
                const totalPago = pago?.total ?? 0;
                const restante = Math.max(0, l.share_cents - totalPago);
                const status: "pago" | "parcial" | "aberto" =
                  totalPago >= l.share_cents ? "pago" : totalPago > 0 ? "parcial" : "aberto";
                const despesa = transacoesVinculadas[l.transaction_id];
                const categoria = l.category_id ? categoriasPorId.get(l.category_id) : null;
                const pagador = l.payer_profile_id === eu.id ? eu : parceiro;
                const devedorLinha = l.debtor_profile_id === eu.id ? eu : parceiro;

                return (
                  <ListRow key={chave}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        {categoria && <span className="mr-1.5">{categoria.icon}</span>}
                        {despesa?.description || "Sem descrição"}
                        <Badge
                          variant="outline"
                          className={cn(
                            "ml-2 font-normal",
                            status === "pago" &&
                              "border-emerald-600/40 text-emerald-700 dark:text-emerald-400",
                            status === "parcial" &&
                              "border-amber-600/40 text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {status === "pago" ? "Pago" : status === "parcial" ? "Parcial" : "Em aberto"}
                        </Badge>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {dataBR(l.occurred_on)} · {pagador.display_name} pagou,{" "}
                        {devedorLinha.display_name} deve{" "}
                        <span className="text-foreground font-medium">
                          {formatMoney(l.share_cents, moedaCasal)}
                        </span>
                      </p>
                      {pago?.vinculos.map((v) => {
                        const t = v.transferId ? transacoesVinculadas[v.transferId] : null;
                        return (
                          <p key={v.itemId} className="text-xs text-emerald-600">
                            🔗 {t?.description ?? "transferência"}
                            {t && ` (${dataBR(t.occurred_on)})`} —{" "}
                            {formatMoney(v.amount, moedaCasal)}{" "}
                            <button
                              type="button"
                              className="underline"
                              onClick={() => desvincularItem(v.itemId)}
                              disabled={pendente}
                            >
                              desvincular
                            </button>
                          </p>
                        );
                      })}
                    </div>
                    {status !== "pago" && (
                      <Dialog
                        open={linkingRow?.transaction_id === l.transaction_id}
                        onOpenChange={(v) => !v && setLinkingRow(null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                            onClick={() => abrirVincular(l, restante)}
                          >
                            Vincular pagamento
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Vincular pagamento</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={confirmarVincular} className="space-y-4">
                            <p className="text-muted-foreground text-sm">
                              {devedorLinha.display_name} → {pagador.display_name} ·{" "}
                              {despesa?.description || "essa despesa"}
                            </p>
                            <MoneyInput
                              label="Valor pago"
                              value={valorVincular}
                              onChange={setValorVincular}
                              currency={moedaCasal}
                            />
                            {candidatosVincular.length > 0 ? (
                              <div className="space-y-1.5">
                                <span className="text-muted-foreground text-xs">
                                  Pode ser uma dessas transferências do período:
                                </span>
                                <div className="space-y-1">
                                  {candidatosVincular.map((c) => {
                                    const selecionado = transferenciaEscolhida === c.id;
                                    return (
                                      <button
                                        key={c.id}
                                        type="button"
                                        onClick={() =>
                                          setTransferenciaEscolhida((atual) =>
                                            atual === c.id ? null : c.id,
                                          )
                                        }
                                        className={cn(
                                          "flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                                          selecionado
                                            ? "border-primary bg-secondary"
                                            : "hover:bg-muted",
                                        )}
                                      >
                                        <span className="min-w-0 flex-1 truncate">
                                          {selecionado && "✓ "}
                                          {c.description || ROTULO_TIPO[c.type]}
                                          <span className="text-muted-foreground">
                                            {" "}
                                            · {contasPorId.get(c.account_id) ?? "conta"} ·{" "}
                                            {dataBR(c.occurred_on)}
                                          </span>
                                        </span>
                                        <span className="shrink-0 font-medium tabular-nums">
                                          {formatMoney(c.amount_cents, moedaCasal)}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-xs">
                                Nenhuma transferência parecida encontrada nesse período. Ajuste
                                o valor ou mude o período no topo do card.
                              </p>
                            )}
                            <DialogFooter>
                              <Button type="submit" disabled={pendente}>
                                {pendente ? "Salvando…" : "Confirmar"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </ListRow>
                );
              })
          )}
        </CardContent>
      </Card>

      {settlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de acertos</CardTitle>
            <div className="relative pt-2">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 translate-y-[calc(-50%+0.25rem)]" />
              <Input
                className="h-8 pl-8"
                placeholder="Buscar por nota (Pix, dinheiro…)"
                value={buscaHistorico}
                onChange={(e) => setBuscaHistorico(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="divide-border/70 divide-y p-0">
            {historico.length === 0 ? (
              <p className="text-muted-foreground px-4 py-6 text-center text-sm">
                Nenhum acerto com essa nota.
              </p>
            ) : (
              historico.map((s) => {
                const de = s.from_profile === eu.id ? eu : parceiro;
                const para = s.to_profile === eu.id ? eu : parceiro;
                const vinculo = s.transaction_id ? transacoesVinculadas[s.transaction_id] : null;
                return (
                  <ListRow key={s.id}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        {de.display_name} → {para.display_name}
                        {s.note && (
                          <Badge variant="outline" className="ml-2 font-normal">
                            {s.note}
                          </Badge>
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {dataBR(s.settled_on)}
                        {vinculo && (
                          <span className="text-emerald-600">
                            {" "}
                            🔗 {vinculo.description} ({dataBR(vinculo.occurred_on)})
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {formatMoney(s.amount_cents, moedaCasal)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => desfazer(s.id)}
                      disabled={pendente}
                      aria-label="Desfazer"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </ListRow>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
