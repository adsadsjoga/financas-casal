"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CreditCard, Receipt } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyInput } from "@/components/app/money-input";
import { formatAmount, formatMoney } from "@/lib/money";
import { addMeses, dataBR, hojeISO, nomeDoMes } from "@/lib/dates";
import { estimativaVencimento, faturaAbertaHoje } from "@/lib/invoices";
import { salvarTransacao } from "@/app/(app)/transacoes/actions";
import type { Account, Category, Transaction } from "@/lib/database.types";

export function FaturaClient({
  cartao,
  transacoes,
  saldoAtual,
  contasPagamento,
  categorias,
  moedaCasal,
}: {
  cartao: Account;
  transacoes: Transaction[];
  saldoAtual: number;
  contasPagamento: Account[];
  categorias: Category[];
  moedaCasal: string;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [dialogAberto, setDialogAberto] = useState(false);

  const faturaAberta = useMemo(
    () => faturaAbertaHoje(cartao.closing_day, hojeISO()),
    [cartao.closing_day],
  );
  const [mes, setMes] = useState(faturaAberta);

  const [contaPagamento, setContaPagamento] = useState(
    cartao.payment_account_id ?? contasPagamento[0]?.id ?? "",
  );
  const [valorPago, setValorPago] = useState("");
  const [dataPagamento, setDataPagamento] = useState(hojeISO());

  const mapaCategorias = new Map(categorias.map((c) => [c.id, c]));

  const porFatura = useMemo(() => {
    const mapa = new Map<string, Transaction[]>();
    for (const t of transacoes) {
      const chave = t.invoice_month ?? "sem-fatura";
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(t);
    }
    return mapa;
  }, [transacoes]);

  const linhasDoMes = porFatura.get(mes) ?? [];
  const totalFatura = linhasDoMes.reduce(
    (acc, t) => acc + (t.type === "receita" ? -t.amount_cents : t.amount_cents),
    0,
  );

  const proximasFaturas = useMemo(() => {
    return [...porFatura.entries()]
      .filter(([chave]) => chave !== "sem-fatura" && chave > faturaAberta)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mesRef, linhas]) => ({
        mes: mesRef,
        total: linhas.reduce((acc, t) => acc + t.amount_cents, 0),
        n: linhas.length,
      }));
  }, [porFatura, faturaAberta]);

  const vencimento =
    cartao.closing_day && cartao.due_day
      ? estimativaVencimento(mes, cartao.closing_day, cartao.due_day)
      : null;

  function abrirPagamento() {
    setValorPago(formatAmount(Math.abs(totalFatura)));
    setDataPagamento(hojeISO());
    setDialogAberto(true);
  }

  function confirmarPagamento(e: React.FormEvent) {
    e.preventDefault();
    if (!contaPagamento) {
      toast.error("Escolha de qual conta sai o pagamento.");
      return;
    }
    startTransition(async () => {
      const r = await salvarTransacao({
        type: "transferencia",
        account_id: contaPagamento,
        transfer_account_id: cartao.id,
        valor: valorPago,
        description: `Pagamento fatura ${cartao.name} — ${nomeDoMes(mes)}`,
        occurred_on: dataPagamento,
        split_mode: "none",
      });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui registrar o pagamento.");
        return;
      }
      toast.success("Pagamento registrado.");
      setDialogAberto(false);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: cartao.color }}
        >
          <CreditCard className="size-4" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{cartao.name}</h1>
          <p className="text-muted-foreground text-sm">
            Saldo devedor atual: {formatMoney(Math.abs(saldoAtual), cartao.currency)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setMes(addMeses(mes, -1))}
              aria-label="Fatura anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-32 text-center text-sm font-medium capitalize">
              {nomeDoMes(mes)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setMes(addMeses(mes, 1))}
              aria-label="Próxima fatura"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          {mes === faturaAberta && <Badge variant="secondary">em aberto</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-muted-foreground text-xs">Total desta fatura</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatMoney(totalFatura, cartao.currency)}
              </p>
              {cartao.closing_day && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Fecha dia {cartao.closing_day}
                  {vencimento && ` · vence ~${dataBR(vencimento)}`}
                </p>
              )}
            </div>
            <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
              <DialogTrigger asChild>
                <Button onClick={abrirPagamento} disabled={contasPagamento.length === 0}>
                  Pagar fatura
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Pagar fatura — {nomeDoMes(mes)}</DialogTitle>
                </DialogHeader>
                <form onSubmit={confirmarPagamento} className="space-y-4">
                  <p className="text-muted-foreground text-xs">
                    Registrado como transferência — o gasto não conta de novo.
                  </p>
                  <div className="space-y-2">
                    <Label>Pagar com</Label>
                    <Select value={contaPagamento} onValueChange={setContaPagamento}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Escolher conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {contasPagamento.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <MoneyInput
                    label="Valor"
                    value={valorPago}
                    onChange={setValorPago}
                    currency={
                      contasPagamento.find((c) => c.id === contaPagamento)?.currency ??
                      moedaCasal
                    }
                    required
                  />
                  <div className="space-y-2">
                    <Label htmlFor="data-pagamento">Data</Label>
                    <Input
                      id="data-pagamento"
                      type="date"
                      required
                      value={dataPagamento}
                      onChange={(e) => setDataPagamento(e.target.value)}
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
          </div>

          {linhasDoMes.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nenhum lançamento nesta fatura.
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              {linhasDoMes.map((t) => {
                const categoria = t.category_id ? mapaCategorias.get(t.category_id) : null;
                return (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {t.description || categoria?.name || "Sem descrição"}
                        </p>
                        {t.installment_total && t.installment_total > 1 && (
                          <Badge variant="outline" className="shrink-0 font-normal">
                            {t.installment_no}/{t.installment_total}
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {dataBR(t.occurred_on)}
                        {categoria && ` · ${categoria.icon} ${categoria.name}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-medium tabular-nums ${
                        t.type === "receita" ? "text-emerald-600" : ""
                      }`}
                    >
                      {t.type === "receita" ? "−" : ""}
                      {formatMoney(t.amount_cents, cartao.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <Button asChild variant="ghost" size="sm" className="w-full">
            <a href={`/transacoes?conta=${cartao.id}`}>
              <Receipt className="size-4" />
              Ver e editar lançamentos desta conta
            </a>
          </Button>
        </CardContent>
      </Card>

      {proximasFaturas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Já comprometido nos próximos meses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {proximasFaturas.map((f) => (
              <button
                key={f.mes}
                type="button"
                onClick={() => setMes(f.mes)}
                className="hover:bg-muted flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors"
              >
                <span className="capitalize">{nomeDoMes(f.mes)}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatMoney(f.total, cartao.currency)} · {f.n}{" "}
                  {f.n === 1 ? "lançamento" : "lançamentos"}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
