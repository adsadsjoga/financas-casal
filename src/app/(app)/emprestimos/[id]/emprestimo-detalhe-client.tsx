"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  Link2,
  Search,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/app/page-header";
import { ContraparteCombobox } from "@/components/app/contraparte-combobox";
import { BuscaLancamentoSheet } from "../busca-lancamento-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { dataBR } from "@/lib/dates";
import { resumoEmprestimo } from "@/lib/emprestimos";
import { atualizarDadosEmprestimo, vincularLancamentoEmprestimo } from "../actions";
import type {
  Account,
  Loan,
  LoanLinkRole,
  LoanTransactionLink,
  Transaction,
} from "@/lib/database.types";

const roles = [
  ["desembolso", "Desembolso"],
  ["pagamento", "Pagamento"],
] as const;

export function EmprestimoDetalheClient({
  loan,
  links,
  transactions,
  transacoesVinculadas,
  accounts,
  categorias,
  contrapartes,
  moeda,
}: {
  loan: Loan;
  links: LoanTransactionLink[];
  transactions: Transaction[];
  transacoesVinculadas: Array<{
    id: string;
    occurred_on: string;
    description: string;
    category_id: string | null;
    amount_primary_cents: number;
    type: string;
    account_id: string;
  }>;
  accounts: Pick<Account, "id" | "name" | "currency" | "type">[];
  categorias: Array<{ id: string; name: string; icon: string }>;
  contrapartes: Array<{ id: string; name: string }>;
  moeda: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [txId, setTxId] = useState("");
  const [role, setRole] = useState<LoanLinkRole>("pagamento");
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [editando, setEditando] = useState(false);
  const [descricao, setDescricao] = useState(loan.description);
  const [pessoaNome, setPessoaNome] = useState(
    contrapartes.find((c) => c.id === loan.counterparty_id)?.name ?? "",
  );
  const [counterpartyId, setCounterpartyId] = useState<string | null>(loan.counterparty_id);
  const [expectedReturnDate, setExpectedReturnDate] = useState(loan.expected_return_date ?? "");
  const [notes, setNotes] = useState(loan.notes);

  const linked = new Set(links.map((l) => l.transaction_id));
  const transacoesPorId = new Map(
    transactions.map((t) => [
      t.id,
      { type: t.type, amount_primary_cents: t.amount_primary_cents, account_id: t.account_id },
    ]),
  );
  const contasPorId = new Map(accounts.map((a) => [a.id, { type: a.type }]));
  const resumo = resumoEmprestimo(loan, links, transacoesPorId, contasPorId);
  const quitado = resumo.saldo <= 0 && resumo.pagoTotal > 0;

  const categoriasPorId = new Map(categorias.map((c) => [c.id, c]));
  const contasComNome = new Map(accounts.map((a) => [a.id, { name: a.name }]));
  const vinculadasPorId = new Map(transacoesVinculadas.map((t) => [t.id, t]));

  function salvarEdicao() {
    start(async () => {
      const r = await atualizarDadosEmprestimo({
        id: loan.id,
        description: descricao,
        counterpartyId,
        expectedReturnDate,
        notes,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Empréstimo atualizado.");
      setEditando(false);
      router.refresh();
    });
  }

  function link() {
    if (!txId) return;
    start(async () => {
      const r = await vincularLancamentoEmprestimo({ loanId: loan.id, transactionId: txId, role });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Lançamento vinculado.");
      setTxId("");
      router.refresh();
    });
  }

  return (
    <>
      <PageHeader
        voltar={{ href: "/emprestimos", rotulo: "Voltar para empréstimos" }}
        icone={<HandCoins className="size-5" />}
        sobretitulo={loan.direction === "emprestei" ? "A receber" : "A pagar"}
        titulo={loan.description}
        descricao={dataBR(loan.occurred_on)}
        acao={quitado ? <Badge variant="secondary">Quitado</Badge> : undefined}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do empréstimo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {editando ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pessoa/empresa</Label>
                <ContraparteCombobox
                  contrapartes={contrapartes}
                  texto={pessoaNome}
                  onTextoChange={setPessoaNome}
                  onSelecionar={setCounterpartyId}
                  placeholder="Nome de quem empresta/pega"
                />
              </div>
              <div className="space-y-2">
                <Label>Previsão de devolução</Label>
                <Input
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <textarea
                  className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm outline-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={salvarEdicao} disabled={pending}>
                  {pending ? "Salvando…" : "Salvar"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditando(false)}
                  disabled={pending}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Valor</p>
                <p className="font-medium">{formatMoney(loan.principal_cents, moeda)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pessoa/empresa</p>
                <p className="font-medium">
                  {contrapartes.find((c) => c.id === loan.counterparty_id)?.name ??
                    "Sem contraparte"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Previsão de devolução</p>
                <p className="font-medium">
                  {loan.expected_return_date ? dataBR(loan.expected_return_date) : "—"}
                </p>
              </div>
              {loan.notes && (
                <div className="sm:col-span-3">
                  <p className="text-muted-foreground">Observações</p>
                  <p className="font-medium">{loan.notes}</p>
                </div>
              )}
              <div className="sm:col-span-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setEditando(true)}
                >
                  Editar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletCards className="size-4" />
            Saldo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-xs">
            Calculado a partir dos lançamentos vinculados abaixo — não é
            digitado à mão.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-muted-foreground text-xs">Valor original</p>
              <p className="mt-1 text-sm font-bold tabular-nums">
                {formatMoney(resumo.principal, moeda)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Já pago</p>
              <p className="mt-1 text-sm font-bold tabular-nums">
                {formatMoney(resumo.pagoTotal, moeda)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">
                {loan.direction === "emprestei" ? "Saldo a receber" : "Saldo a pagar"}
              </p>
              <p
                className={
                  "mt-1 text-sm font-bold tabular-nums " +
                  (resumo.saldo > 0 ? "text-rose-600" : "text-emerald-600")
                }
              >
                {formatMoney(Math.max(resumo.saldo, 0), moeda)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="size-4" />
            Conciliar com o Revolut
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-xs">
            Vincule o desembolso original e as devoluções que já estão em
            Lançamentos. O vínculo organiza sem duplicar dinheiro.
          </p>
          <div className="space-y-2">
            <Select value={txId} onValueChange={setTxId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolher lançamento" />
              </SelectTrigger>
              <SelectContent>
                {transactions
                  .filter((t) => !linked.has(t.id))
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {dataBR(t.occurred_on)} · {t.description || "Sem descrição"} ·{" "}
                      {accounts.find((a) => a.id === t.account_id)?.name ?? ""} ·{" "}
                      {formatMoney(
                        t.amount_cents,
                        accounts.find((a) => a.id === t.account_id)?.currency ?? moeda,
                      )}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Select value={role} onValueChange={(v) => setRole(v as LoanLinkRole)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={link} disabled={pending || !txId}>
                Vincular
              </Button>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBuscaAberta(true)}
          >
            <Search className="size-4" />
            Buscar lançamento por texto
          </Button>
          <p className="text-muted-foreground text-xs">
            A lista acima só mostra os últimos 2 meses. Pra achar um mais
            antigo, busque por texto.
          </p>
          {links.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              {links.map((l) => {
                const t = vinculadasPorId.get(l.transaction_id);
                const categoria = t?.category_id ? categoriasPorId.get(t.category_id) : null;
                const conta = t ? accounts.find((a) => a.id === t.account_id) : null;
                return (
                  <div key={l.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-start gap-2">
                      {t?.type === "receita" ? (
                        <ArrowDownLeft className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                      ) : t?.type === "despesa" ? (
                        <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-rose-600" />
                      ) : null}
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="font-normal">
                            {roles.find((r) => r[0] === l.role)?.[1] ?? l.role}
                          </Badge>
                          <span className="truncate">{t?.description || "Sem descrição"}</span>
                        </p>
                        {t && (
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {dataBR(t.occurred_on)}
                            {conta && ` · ${conta.name}`}
                            {categoria && ` · ${categoria.icon} ${categoria.name}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {t && (
                        <span
                          className={`font-medium tabular-nums ${
                            t.type === "receita" ? "text-emerald-600" : ""
                          }`}
                        >
                          {t.type === "receita" ? "+" : "−"}
                          {formatMoney(t.amount_primary_cents, moeda)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <BuscaLancamentoSheet
        aberto={buscaAberta}
        onOpenChange={setBuscaAberta}
        loanId={loan.id}
        categorias={categoriasPorId}
        contas={contasComNome}
        moeda={moeda}
        onVinculado={() => router.refresh()}
      />
    </>
  );
}
