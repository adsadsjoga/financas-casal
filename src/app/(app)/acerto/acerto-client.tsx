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
  CATEGORIAS_FORA_DO_RESULTADO,
  CATEGORIA_INVESTIMENTOS,
} from "@/lib/constants";
import { normalizeDescription } from "@/lib/normalize-text";
import {
  calcularUsoPorPagamento,
  contaRecebimentoId,
  pagamentoCombinaComDivida,
} from "@/lib/acerto";
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
  SplitMode,
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

// Exclusões locais ao /acerto -- não mexem em src/lib/constants.ts (isso
// mudaria o que a Home/Orçamentos também mostram). "Transferências
// internas" fica DE FORA da lista de pagamento de propósito: é justamente
// a categoria onde o Pix entre o casal costuma cair -- excluir ela
// removeria o próprio pagamento que estamos tentando achar.
const CATEGORIAS_EXCLUIDAS_DESPESA = new Set(
  [...CATEGORIAS_FORA_DO_RESULTADO, CATEGORIA_INVESTIMENTOS].map(normalizeDescription),
);
const CATEGORIAS_EXCLUIDAS_PAGAMENTO = new Set(
  ["Saques e dinheiro", CATEGORIA_INVESTIMENTOS].map(normalizeDescription),
);

function categoriaExcluida(
  categoryId: string | null | undefined,
  categoriasPorId: Map<string, { name: string }>,
  excluidas: Set<string>,
): boolean {
  if (!categoryId) return false;
  const nome = categoriasPorId.get(categoryId)?.name;
  return !!nome && excluidas.has(normalizeDescription(nome));
}

export interface DespesaDoPeriodo {
  id: string;
  description: string | null;
  amount_cents: number;
  occurred_on: string;
  category_id: string | null;
  payer_profile_id: string | null;
  split_mode: SplitMode;
  account_id: string;
}

interface VinculoInfo {
  total: number;
  vinculos: Array<{ itemId: string; transferId: string | null; amount: number }>;
}

/** Uma linha da Coluna A — já dividida (vem do split_ledger) ou ainda não (vem direto de `transactions`). */
interface LinhaAberta {
  transactionId: string;
  jaDividida: boolean;
  occurredOn: string;
  categoryId: string | null;
  description: string;
  payerProfileId: string;
  debtorProfileId: string;
  /** Quanto ainda falta vincular dessa despesa (valor sugerido no formulário). */
  restante: number;
  status: "parcial" | "aberto";
}

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
  despesasDoPeriodo,
  transacoesVinculadas,
  periodo,
  carrosTransactionIds,
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
  contas: Array<{ id: string; name: string; owner_profile_id: string | null }>;
  transacoesDoMes: TransacaoParaSugestao[];
  /** Mesma janela do seletor de período no topo — Coluna B (pagamentos) e candidatos do "Marcar como acertado". */
  transacoesDoPeriodo: TransacaoParaSugestao[];
  /** TODAS as despesas do período, divididas ou não — Coluna A. */
  despesasDoPeriodo: DespesaDoPeriodo[];
  /** transaction_id -> descrição/data/conta, pra mostrar histórico e despesas divididas já vinculadas. */
  transacoesVinculadas: Record<string, { description: string; occurred_on: string; account_id?: string }>;
  periodo: Periodo;
  /** IDs de transação vinculados a carro (vehicle_transaction_links) -- negócio, não gasto/pagamento pessoal. */
  carrosTransactionIds: string[];
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [valor, setValor] = useState("");
  const [nota, setNota] = useState("");
  const [transacaoVinculada, setTransacaoVinculada] = useState<string | null>(null);
  const [buscaHistorico, setBuscaHistorico] = useState("");

  const [despesaEscolhida, setDespesaEscolhida] = useState<LinhaAberta | null>(null);
  const [pagamentoEscolhido, setPagamentoEscolhido] = useState<string | null>(null);
  const [valorVincular, setValorVincular] = useState("");
  const [valorParteDevida, setValorParteDevida] = useState("");
  const [buscaDespesas, setBuscaDespesas] = useState("");
  const [buscaPagamentos, setBuscaPagamentos] = useState("");
  const [filtroCategoriaDespesa, setFiltroCategoriaDespesa] = useState("todas");
  const [filtroDevedor, setFiltroDevedor] = useState("todos");
  const [filtroConta, setFiltroConta] = useState("todas");
  const [filtroTipoPagamento, setFiltroTipoPagamento] = useState("todos");
  const [filtroPessoaPagamento, setFiltroPessoaPagamento] = useState("todos");

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
  const donoDaContaPorId = new Map(contas.map((c) => [c.id, c.owner_profile_id]));
  const categoriasPorId = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias],
  );
  const carrosSet = useMemo(() => new Set(carrosTransactionIds), [carrosTransactionIds]);
  const candidatos = useMemo(() => {
    const cents = parseBRL(valor);
    return cents ? sugerirTransacoesParecidas(transacoesDoMes, cents) : [];
  }, [valor, transacoesDoMes]);

  // Quanto já foi vinculado a cada despesa dividida, por par pagador/devedor
  // -- chave composta porque `settlement_items` não guarda o devedor
  // diretamente, só via o settlement.
  const pagoPorItem = useMemo(() => {
    const mapa = new Map<string, VinculoInfo>();
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

  const usoPorPagamento = useMemo(
    () => calcularUsoPorPagamento(settlements, settlementItems),
    [settlements, settlementItems],
  );

  // Coluna A: despesas do periodo que podem ser acertadas. Entram tanto as
  // despesas ja divididas com saldo aberto quanto despesas normais ainda sem
  // split, porque essa tela funciona como conciliacao lado a lado.
  const linhasAbertas = useMemo(() => {
    const linhas: LinhaAberta[] = [];
    const divididasNoPeriodo = new Set<string>();
    for (const l of ledgerPeriodo) {
      divididasNoPeriodo.add(l.transaction_id);
      if (
        categoriaExcluida(l.category_id, categoriasPorId, CATEGORIAS_EXCLUIDAS_DESPESA) ||
        carrosSet.has(l.transaction_id)
      )
        continue;
      const chave = `${l.transaction_id}|${l.debtor_profile_id}|${l.payer_profile_id}`;
      const totalPago = pagoPorItem.get(chave)?.total ?? 0;
      if (totalPago >= l.share_cents) continue;
      linhas.push({
        transactionId: l.transaction_id,
        jaDividida: true,
        occurredOn: l.occurred_on,
        categoryId: l.category_id,
        description: transacoesVinculadas[l.transaction_id]?.description || "Sem descrição",
        payerProfileId: l.payer_profile_id,
        debtorProfileId: l.debtor_profile_id,
        restante: l.share_cents - totalPago,
        status: totalPago > 0 ? "parcial" : "aberto",
      });
    }
    for (const d of despesasDoPeriodo) {
      if (d.split_mode !== "none" || !d.payer_profile_id || divididasNoPeriodo.has(d.id))
        continue;
      if (
        categoriaExcluida(d.category_id, categoriasPorId, CATEGORIAS_EXCLUIDAS_DESPESA) ||
        carrosSet.has(d.id)
      )
        continue;
      linhas.push({
        transactionId: d.id,
        jaDividida: false,
        occurredOn: d.occurred_on,
        categoryId: d.category_id,
        description: d.description || "Sem descrição",
        payerProfileId: d.payer_profile_id,
        debtorProfileId: d.payer_profile_id === eu.id ? parceiro.id : eu.id,
        restante: Math.round(d.amount_cents / 2),
        status: "aberto",
      });
    }
    return linhas.sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
  }, [
    ledgerPeriodo,
    despesasDoPeriodo,
    pagoPorItem,
    transacoesVinculadas,
    categoriasPorId,
    carrosSet,
    eu.id,
    parceiro.id,
  ]);

  const linhasFiltradas = linhasAbertas.filter((l) => {
    if (
      buscaDespesas.trim() &&
      !l.description.toLowerCase().includes(buscaDespesas.trim().toLowerCase())
    )
      return false;
    if (filtroCategoriaDespesa === "sem-categoria" && l.categoryId !== null) return false;
    if (
      filtroCategoriaDespesa !== "todas" &&
      filtroCategoriaDespesa !== "sem-categoria" &&
      l.categoryId !== filtroCategoriaDespesa
    )
      return false;
    if (filtroDevedor !== "todos" && l.debtorProfileId !== filtroDevedor) return false;
    return true;
  });


  // Coluna B: transferências e receitas do período que realisticamente
  // podem ser o pagamento de uma dívida entre o casal -- exclui
  // Investimentos/Saques (ruído) e transferência interna de UMA pessoa só
  // (ex.: Gabriel movendo dinheiro da própria corrente pra própria
  // poupança não é pagamento de nada pro parceiro).
  const pagamentosPeriodo = transacoesDoPeriodo.filter((t) => {
    if (t.type === "despesa") return false;
    if (categoriaExcluida(t.category_id, categoriasPorId, CATEGORIAS_EXCLUIDAS_PAGAMENTO))
      return false;
    if (carrosSet.has(t.id)) return false;
    if (t.type === "transferencia") {
      const donoOrigem = donoDaContaPorId.get(t.account_id) ?? null;
      const donoDestino = t.transfer_account_id
        ? (donoDaContaPorId.get(t.transfer_account_id) ?? null)
        : null;
      if (donoOrigem === donoDestino) return false;
    }
    return true;
  });
  const pagamentosFiltrados = pagamentosPeriodo.filter((t) => {
    const contaRecebimento = contaRecebimentoId(t);
    const donoRecebimento = contaRecebimento
      ? (donoDaContaPorId.get(contaRecebimento) ?? null)
      : null;
    const disponivel = t.amount_cents - (usoPorPagamento.get(t.id) ?? 0);
    if (disponivel <= 0) return false;
    if (
      despesaEscolhida &&
      !pagamentoCombinaComDivida(
        t,
        donoDaContaPorId,
        despesaEscolhida.debtorProfileId,
        despesaEscolhida.payerProfileId,
      )
    )
      return false;
    if (
      buscaPagamentos.trim() &&
      !(t.description || "").toLowerCase().includes(buscaPagamentos.trim().toLowerCase())
    )
      return false;
    if (filtroConta !== "todas" && contaRecebimento !== filtroConta) return false;
    if (filtroTipoPagamento !== "todos" && t.type !== filtroTipoPagamento) return false;
    if (filtroPessoaPagamento !== "todos") {
      if (
        filtroPessoaPagamento === "conjunta"
          ? donoRecebimento !== null
          : donoRecebimento !== filtroPessoaPagamento
      )
        return false;
    }
    return true;
  }).sort((a, b) => {
    if (!despesaEscolhida) return b.occurred_on.localeCompare(a.occurred_on);
    const disponivelA = a.amount_cents - (usoPorPagamento.get(a.id) ?? 0);
    const disponivelB = b.amount_cents - (usoPorPagamento.get(b.id) ?? 0);
    const diferencaA = Math.abs(disponivelA - despesaEscolhida.restante);
    const diferencaB = Math.abs(disponivelB - despesaEscolhida.restante);
    return diferencaA - diferencaB || b.occurred_on.localeCompare(a.occurred_on);
  });

  // Escolher uma despesa já filtra a Coluna B pra só mostrar os pagamentos
  // da pessoa que deve — ela é quem devia ter transferido a parte dela,
  // então é ali que o pagamento certo tende a estar.
  function selecionarDespesa(l: LinhaAberta) {
    const desselecionando = despesaEscolhida?.transactionId === l.transactionId;
    setDespesaEscolhida(desselecionando ? null : l);
    setPagamentoEscolhido(null);
    setValorVincular(desselecionando ? "" : formatAmount(l.restante));
    setValorParteDevida(desselecionando || l.jaDividida ? "" : formatAmount(l.restante));
    setFiltroPessoaPagamento("todos");
  }

  function selecionarPagamento(p: TransacaoParaSugestao) {
    const desselecionando = pagamentoEscolhido === p.id;
    setPagamentoEscolhido(desselecionando ? null : p.id);
    if (!desselecionando && despesaEscolhida) {
      const disponivel = p.amount_cents - (usoPorPagamento.get(p.id) ?? 0);
      setValorVincular(formatAmount(Math.min(despesaEscolhida.restante, disponivel)));
    }
  }

  // Despesas do período já 100% cobertas — saem da Coluna A e viram só um
  // histórico compacto com o vínculo e a opção de desvincular.
  const despesasQuitadas = useMemo(() => {
    return ledgerPeriodo
      .map((l) => {
        const chave = `${l.transaction_id}|${l.debtor_profile_id}|${l.payer_profile_id}`;
        const pago = pagoPorItem.get(chave);
        if (!pago || pago.total < l.share_cents) return null;
        return { l, pago };
      })
      .filter((x): x is { l: SplitLedgerRow; pago: VinculoInfo } => x !== null)
      .sort((a, b) => b.l.occurred_on.localeCompare(a.l.occurred_on));
  }, [ledgerPeriodo, pagoPorItem]);

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

  function confirmarVincular(e: React.FormEvent) {
    e.preventDefault();
    if (!despesaEscolhida || !pagamentoEscolhido) {
      toast.error("Escolha uma despesa e um pagamento.");
      return;
    }
    const cents = parseBRL(valorVincular);
    if (cents === null || cents <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    const parteDevidaCents = despesaEscolhida.jaDividida
      ? undefined
      : parseBRL(valorParteDevida);
    if (!despesaEscolhida.jaDividida && (!parteDevidaCents || parteDevidaCents <= 0)) {
      toast.error("Informe quanto dessa despesa a pessoa realmente deve.");
      return;
    }
    startTransition(async () => {
      const r = await vincularPagamentoDivisao({
        expenseTransactionId: despesaEscolhida.transactionId,
        debtorProfileId: despesaEscolhida.debtorProfileId,
        payerProfileId: despesaEscolhida.payerProfileId,
        amountCents: cents,
        debtorShareCents: parteDevidaCents ?? undefined,
        transferTransactionId: pagamentoEscolhido,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui vincular.");
        return;
      }
      toast.success("Vinculado.");
      setDespesaEscolhida(null);
      setPagamentoEscolhido(null);
      setValorVincular("");
      setValorParteDevida("");
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
            Escolha uma despesa e o pagamento que a cobriu — funciona mesmo
            se a despesa ainda não foi marcada como dividida.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Gastos a acertar</p>
                <p className="text-muted-foreground text-xs">Selecione quem deve e o valor em aberto.</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <div className="relative min-w-[120px] flex-1">
                  <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
                  <Input
                    className="h-8 pl-8 text-xs"
                    placeholder="Buscar despesa…"
                    value={buscaDespesas}
                    onChange={(e) => setBuscaDespesas(e.target.value)}
                  />
                </div>
                <Select value={filtroCategoriaDespesa} onValueChange={setFiltroCategoriaDespesa}>
                  <SelectTrigger className="h-8 w-auto text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Categoria</SelectItem>
                    <SelectItem value="sem-categoria">Sem categoria</SelectItem>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filtroDevedor} onValueChange={setFiltroDevedor}>
                  <SelectTrigger className="h-8 w-auto text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Quem deve</SelectItem>
                    <SelectItem value={eu.id}>{eu.display_name}</SelectItem>
                    <SelectItem value={parceiro.id}>{parceiro.display_name}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="divide-border/70 max-h-80 divide-y overflow-y-auto rounded-md border">
                {linhasFiltradas.length === 0 ? (
                  <p className="text-muted-foreground px-3 py-6 text-center text-xs">
                    Nenhuma despesa em aberto nesse período.
                  </p>
                ) : (
                  linhasFiltradas.map((l) => {
                    const categoria = l.categoryId ? categoriasPorId.get(l.categoryId) : null;
                    const devedorLinha = l.debtorProfileId === eu.id ? eu : parceiro;
                    const selecionada = despesaEscolhida?.transactionId === l.transactionId;
                    return (
                      <button
                        key={l.transactionId}
                        type="button"
                        onClick={() => selecionarDespesa(l)}
                        className={cn(
                          "flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-xs transition-colors",
                          selecionada ? "bg-secondary" : "hover:bg-muted",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate">
                            {selecionada && "✓ "}
                            {categoria && <span className="mr-1">{categoria.icon}</span>}
                            {l.description}
                            {!l.jaDividida && (
                              <Badge variant="secondary" className="ml-1.5 font-normal">
                                Nova
                              </Badge>
                            )}
                            {l.status === "parcial" && (
                              <Badge
                                variant="outline"
                                className="ml-1.5 border-amber-600/40 font-normal text-amber-700 dark:text-amber-400"
                              >
                                Parcial
                              </Badge>
                            )}
                          </p>
                          <p className="text-muted-foreground">
                            {dataBR(l.occurredOn)} · {devedorLinha.display_name} deve
                            {!l.jaDividida && " · ainda não dividida"}
                          </p>
                        </div>
                        <span className="shrink-0 font-medium tabular-nums">
                          {formatMoney(l.restante, moedaCasal)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

            </div>

            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Pagamentos recebidos</p>
                <p className="text-muted-foreground text-xs">
                  Entradas recebidas para quitar o gasto.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <div className="relative min-w-[120px] flex-1">
                  <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
                  <Input
                    className="h-8 pl-8 text-xs"
                    placeholder="Buscar pagamento…"
                    value={buscaPagamentos}
                    onChange={(e) => setBuscaPagamentos(e.target.value)}
                  />
                </div>
                <Select value={filtroPessoaPagamento} onValueChange={setFiltroPessoaPagamento}>
                  <SelectTrigger className="h-8 w-auto text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Recebido por</SelectItem>
                    <SelectItem value={eu.id}>{eu.display_name}</SelectItem>
                    <SelectItem value={parceiro.id}>{parceiro.display_name}</SelectItem>
                    <SelectItem value="conjunta">Conjunta</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroConta} onValueChange={setFiltroConta}>
                  <SelectTrigger className="h-8 w-auto text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Conta que recebeu</SelectItem>
                    {contas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filtroTipoPagamento} onValueChange={setFiltroTipoPagamento}>
                  <SelectTrigger className="h-8 w-auto text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Tipo</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="receita">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="divide-border/70 max-h-80 divide-y overflow-y-auto rounded-md border">
                {pagamentosFiltrados.length === 0 ? (
                  <p className="text-muted-foreground px-3 py-6 text-center text-xs">
                    Nenhum pagamento nesse período.
                  </p>
                ) : (
                  pagamentosFiltrados.map((p) => {
                    const selecionado = pagamentoEscolhido === p.id;
                    const contaRecebimento = contaRecebimentoId(p);
                    const contaOrigem = p.type === "transferencia" ? p.account_id : null;
                    const usado = usoPorPagamento.get(p.id) ?? 0;
                    const disponivel = p.amount_cents - usado;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selecionarPagamento(p)}
                        className={cn(
                          "flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-xs transition-colors",
                          selecionado ? "bg-secondary" : "hover:bg-muted",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate">
                            {selecionado && "✓ "}
                            {p.description || ROTULO_TIPO[p.type]}
                          </p>
                          <p className="text-muted-foreground">
                            {p.type === "transferencia"
                              ? `${contasPorId.get(contaOrigem ?? "") ?? "conta"} → ${contasPorId.get(contaRecebimento ?? "") ?? "conta"}`
                              : `Recebido em ${contasPorId.get(contaRecebimento ?? "") ?? "conta"}`} ·{" "}
                            {dataBR(p.occurred_on)}
                          </p>
                          {usado > 0 && (
                            <p className="text-muted-foreground">
                              {formatMoney(disponivel, moedaCasal)} disponível de{" "}
                              {formatMoney(p.amount_cents, moedaCasal)}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 font-medium tabular-nums">
                          {formatMoney(disponivel, moedaCasal)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {despesaEscolhida && pagamentoEscolhido && (
            <form
              onSubmit={confirmarVincular}
              className="border-primary/30 bg-secondary/40 flex flex-wrap items-end gap-3 rounded-md border p-3"
            >
              {!despesaEscolhida.jaDividida && (
                <div className="min-w-40 flex-1">
                  <MoneyInput
                    label={`Parte devida por ${
                      despesaEscolhida.debtorProfileId === eu.id
                        ? eu.display_name
                        : parceiro.display_name
                    }`}
                    value={valorParteDevida}
                    onChange={setValorParteDevida}
                    currency={moedaCasal}
                  />
                </div>
              )}
              <div className="min-w-40 flex-1">
                <MoneyInput
                  label="Valor pago agora"
                  value={valorVincular}
                  onChange={setValorVincular}
                  currency={moedaCasal}
                />
              </div>
              <Button type="submit" disabled={pendente}>
                {pendente ? "Vinculando…" : "Vincular"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDespesaEscolhida(null);
                  setPagamentoEscolhido(null);
                  setValorVincular("");
                  setValorParteDevida("");
                }}
              >
                Cancelar
              </Button>
            </form>
          )}

          {despesasQuitadas.length > 0 && (
            <div className="space-y-1.5 border-t pt-3">
              <p className="text-muted-foreground text-xs font-medium">
                Já quitados nesse período
              </p>
              {despesasQuitadas.map(({ l, pago }) => {
                const despesa = transacoesVinculadas[l.transaction_id];
                const categoria = l.category_id ? categoriasPorId.get(l.category_id) : null;
                return (
                  <div key={l.transaction_id} className="space-y-0.5 text-xs">
                    <p>
                      {categoria && <span className="mr-1">{categoria.icon}</span>}
                      {despesa?.description || "Sem descrição"}
                      <Badge
                        variant="outline"
                        className="ml-2 border-emerald-600/40 font-normal text-emerald-700 dark:text-emerald-400"
                      >
                        Pago
                      </Badge>
                    </p>
                    {pago.vinculos.map((v) => {
                      const t = v.transferId ? transacoesVinculadas[v.transferId] : null;
                      return (
                        <p key={v.itemId} className="text-emerald-600">
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
                );
              })}
            </div>
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
