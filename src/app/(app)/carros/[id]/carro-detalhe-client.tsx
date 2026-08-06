"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CarFront,
  Link2,
  MoreVertical,
  Plus,
  Search,
  Unlink,
  Users,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/app/page-header";
import { PessoaSheet } from "@/components/app/pessoa-sheet";
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
import { dataBR, hojeISO } from "@/lib/dates";
import { resumoRecebimentoVeiculo } from "@/lib/carros";
import type { TransacaoDetalhada } from "@/lib/pessoas";
import {
  adicionarCustoCarro,
  atualizarCompradorCarro,
  desvincularLancamento,
  trocarPapelVinculo,
  vincularLancamento,
  type VehicleLinkRole,
} from "../actions";
import type {
  Vehicle,
  VehicleCost,
  VehicleInstallment,
  VehicleTransactionLink,
  Transaction,
  Account,
} from "@/lib/database.types";
const roles = [
  ["compra", "Compra"],
  ["custo", "Custo"],
  ["entrada", "Entrada"],
  ["parcela", "Parcela"],
  ["ajuste", "Ajuste"],
] as const;
export function CarroDetalheClient({
  vehicle,
  costs,
  installments,
  links,
  transactions,
  transacoesVinculadas,
  accounts,
  categorias,
  contrapartes,
  transacoesComprador,
  moeda,
}: {
  vehicle: Vehicle;
  costs: VehicleCost[];
  installments: VehicleInstallment[];
  links: VehicleTransactionLink[];
  transactions: Transaction[];
  /** Dia exato, descrição e categoria de cada transação vinculada — pra exibir no lugar do "Vinculado" genérico. */
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
  /** Todas as transações do comprador, em qualquer conta, ainda sem vínculo. */
  transacoesComprador: TransacaoDetalhada[];
  moeda: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [category, setCategory] = useState("Mecânica"),
    [description, setDescription] = useState(""),
    [amount, setAmount] = useState(""),
    [date, setDate] = useState(hojeISO()),
    [txId, setTxId] = useState(""),
    [role, setRole] = useState<
      "compra" | "custo" | "entrada" | "parcela" | "ajuste"
    >("custo");
  const [sheetComprador, setSheetComprador] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [vinculandoLote, setVinculandoLote] = useState(false);
  const [editandoPapelDe, setEditandoPapelDe] = useState<VehicleTransactionLink | null>(null);
  const [novoPapel, setNovoPapel] = useState<VehicleLinkRole>("custo");
  const [editandoComprador, setEditandoComprador] = useState(false);
  const [buyerNameEdit, setBuyerNameEdit] = useState(vehicle.buyer_name);
  const [buyerCounterpartyIdEdit, setBuyerCounterpartyIdEdit] = useState<string | null>(
    vehicle.buyer_counterparty_id,
  );
  const custo = costs.reduce((s, c) => s + c.amount_cents, 0),
    total = vehicle.purchase_price_cents + custo,
    sale = vehicle.sale_price_cents ?? vehicle.desired_sale_price_cents ?? 0,
    lucro = sale - total,
    linked = new Set(links.map((l) => l.transaction_id));

  const transacoesPorId = new Map(
    transactions.map((t) => [
      t.id,
      { type: t.type, amount_primary_cents: t.amount_primary_cents, account_id: t.account_id },
    ]),
  );
  const contasPorId = new Map(accounts.map((a) => [a.id, { type: a.type }]));
  const recebimento = resumoRecebimentoVeiculo(vehicle, links, transacoesPorId, contasPorId);
  const temVenda = vehicle.sale_price_cents !== null;

  const categoriasPorId = new Map(categorias.map((c) => [c.id, c]));
  const contasComNome = new Map(accounts.map((a) => [a.id, { name: a.name }]));
  const vinculadasPorId = new Map(transacoesVinculadas.map((t) => [t.id, t]));

  function vincularEmLote(transactionIds: string[]) {
    setVinculandoLote(true);
    start(async () => {
      const resultados = await Promise.all(
        transactionIds.map((transactionId) =>
          vincularLancamento({ vehicleId: vehicle.id, transactionId, role: "parcela" }),
        ),
      );
      setVinculandoLote(false);
      const falhas = resultados.filter((r) => !r.ok).length;
      if (falhas > 0) {
        toast.error(
          falhas === resultados.length
            ? "Não consegui vincular nenhuma."
            : `${resultados.length - falhas} vinculada${resultados.length - falhas === 1 ? "" : "s"}, ${falhas} falhou.`,
        );
      } else {
        toast.success(
          `${resultados.length} lançamento${resultados.length === 1 ? "" : "s"} vinculado${resultados.length === 1 ? "" : "s"} como parcela.`,
        );
      }
      setSheetComprador(false);
      router.refresh();
    });
  }

  function abrirEdicaoComprador() {
    setBuyerNameEdit(vehicle.buyer_name);
    setBuyerCounterpartyIdEdit(vehicle.buyer_counterparty_id);
    setEditandoComprador(true);
  }
  function salvarComprador() {
    start(async () => {
      const r = await atualizarCompradorCarro({
        vehicleId: vehicle.id,
        buyerName: buyerNameEdit,
        buyerCounterpartyId: buyerCounterpartyIdEdit,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Comprador atualizado.");
      setEditandoComprador(false);
      router.refresh();
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await adicionarCustoCarro({
        vehicleId: vehicle.id,
        category,
        description,
        amount,
        occurredOn: date,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Custo adicionado.");
      setAmount("");
      setDescription("");
      router.refresh();
    });
  }
  function link() {
    if (!txId) return;
    start(async () => {
      const r = await vincularLancamento({
        vehicleId: vehicle.id,
        transactionId: txId,
        role,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Lançamento vinculado.");
      setTxId("");
      router.refresh();
    });
  }
  function abrirTrocaPapel(l: VehicleTransactionLink) {
    setNovoPapel(l.role as VehicleLinkRole);
    setEditandoPapelDe(l);
  }
  function salvarTrocaPapel() {
    if (!editandoPapelDe) return;
    start(async () => {
      const r = await trocarPapelVinculo(editandoPapelDe.id, vehicle.id, novoPapel);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Papel atualizado.");
      setEditandoPapelDe(null);
      router.refresh();
    });
  }
  function desvincular(l: VehicleTransactionLink) {
    start(async () => {
      const r = await desvincularLancamento(vehicle.id, l.transaction_id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Vínculo removido.");
      router.refresh();
    });
  }
  return (
    <>
      <PageHeader
        voltar={{ href: "/carros", rotulo: "Voltar para carros" }}
        icone={<CarFront className="size-5" />}
        sobretitulo={vehicle.status === "vendido" ? "Vendido" : "Em estoque"}
        titulo={`${vehicle.make} ${vehicle.model}`}
        descricao={
          <>
            {vehicle.year ?? "—"} · {vehicle.color || "Sem cor"}
            {vehicle.plate ? " · " + vehicle.plate : ""}
          </>
        }
        acao={
          <Badge
            variant={vehicle.status === "vendido" ? "secondary" : "outline"}
          >
            {vehicle.status === "vendido" ? "Vendido" : "Estoque"}
          </Badge>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Compra", vehicle.purchase_price_cents],
          ["Custos", custo],
          ["Investido", total],
          ["Lucro", lucro],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="p-4">
              <p className="text-muted-foreground text-xs">{label}</p>
              <p
                className={
                  "mt-1 font-bold tabular-nums " +
                  (label === "Lucro" && Number(value) < 0
                    ? "text-rose-600"
                    : "")
                }
              >
                {formatMoney(Number(value), moeda)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da venda</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Preço final/desejado</p>
            <p className="font-medium">{formatMoney(sale, moeda)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Comprador</p>
            {editandoComprador ? (
              <div className="mt-1 space-y-2">
                <ContraparteCombobox
                  contrapartes={contrapartes}
                  texto={buyerNameEdit}
                  onTextoChange={setBuyerNameEdit}
                  onSelecionar={setBuyerCounterpartyIdEdit}
                  placeholder="Nome do comprador"
                />
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={salvarComprador} disabled={pending}>
                    {pending ? "Salvando…" : "Salvar"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditandoComprador(false)}
                    disabled={pending}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="font-medium">{vehicle.buyer_name || "Ainda não vendido"}</p>
                {vehicle.buyer_name && !vehicle.buyer_counterparty_id && (
                  <Badge variant="secondary" className="text-amber-700">
                    sem contato vinculado
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={abrirEdicaoComprador}
                >
                  {vehicle.buyer_counterparty_id ? "Trocar" : "Vincular contato"}
                </Button>
              </div>
            )}
            {!editandoComprador && vehicle.buyer_name && !vehicle.buyer_counterparty_id && (
              <p className="text-muted-foreground mt-1 text-xs">
                Sem contato vinculado não dá pra puxar os pagamentos dessa
                pessoa automaticamente — escolha uma sugestão ao vincular.
              </p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground">Compra em</p>
            <p className="font-medium">{vehicle.purchase_date}</p>
          </div>
        </CardContent>
      </Card>
      {temVenda && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <WalletCards className="size-4" />
              Conta do comprador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-xs">
              Calculado a partir dos lançamentos vinculados abaixo — não é
              digitado à mão.
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Vendido por", recebimento.vendidoPor],
                ["Recebido banco", recebimento.recebidoBanco],
                ["Recebido cash", recebimento.recebidoCash],
                ["Saldo a receber", recebimento.saldoAReceber],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p
                    className={
                      "mt-1 text-sm font-bold tabular-nums " +
                      (label === "Saldo a receber" && Number(value) > 0
                        ? "text-rose-600"
                        : "")
                    }
                  >
                    {formatMoney(Number(value), moeda)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {recebimento.saldoAReceber <= 0 && recebimento.recebidoTotal > 0 && (
                <Badge variant="secondary">Quitado</Badge>
              )}
              {vehicle.buyer_counterparty_id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setSheetComprador(true)}
                >
                  <Users className="size-4" />
                  Ver transações de {vehicle.buyer_name || "comprador"}
                  {transacoesComprador.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {transacoesComprador.length}
                    </Badge>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4" />
            Adicionar custo pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                required
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mecânico, peças, transporte…"
              />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={pending} className="sm:col-span-2">
              Salvar custo
            </Button>
          </form>
          <div className="mt-5 divide-y border-t">
            {costs.map((c) => (
              <div
                key={c.id}
                className="flex justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{c.description || c.category}</p>
                  <p className="text-muted-foreground text-xs">
                    {c.category} · {c.occurred_on}
                  </p>
                </div>
                <p className="font-medium tabular-nums">
                  {formatMoney(c.amount_cents, moeda)}
                </p>
              </div>
            ))}
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
            Vincule compras, custos ou recebimentos que já estão em Lançamentos.
            O vínculo organiza sem duplicar dinheiro.
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
                        accounts.find((a) => a.id === t.account_id)?.currency ??
                          moeda,
                      )}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Select
                value={role}
                onValueChange={(v) => setRole(v as typeof role)}
              >
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
            A lista acima só mostra os últimos 2 meses, sem transferência.
            Pra achar um mais antigo, de outra pessoa, ou uma transferência,
            busque por texto.
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7">
                            <MoreVertical className="size-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => abrirTrocaPapel(l)}>
                            <Link2 className="size-4" />
                            Trocar papel
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => desvincular(l)}>
                            <Unlink className="size-4" />
                            Desvincular
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {installments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4" />
              Parcelas a receber
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {installments.map((i) => (
              <div key={i.id} className="flex justify-between py-3 text-sm">
                <span>
                  Parcela {i.installment_no} · vence {i.due_on}
                </span>
                <span className="font-medium tabular-nums">
                  {formatMoney(i.amount_cents, moeda)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 p-4">
          <WalletCards className="text-muted-foreground mt-0.5 size-4" />
          <p className="text-muted-foreground text-xs">
            Para um pagamento em espécie: Revolut → Dinheiro em mãos; depois
            registre e vincule o custo deste carro.
          </p>
        </CardContent>
      </Card>

      <PessoaSheet
        aberto={sheetComprador}
        onOpenChange={setSheetComprador}
        nome={vehicle.buyer_name || "Comprador"}
        transacoes={transacoesComprador}
        categorias={categoriasPorId}
        contas={contasComNome}
        moeda={moeda}
        modo="selecionar"
        onVincular={vincularEmLote}
        vinculando={vinculandoLote}
      />

      <BuscaLancamentoSheet
        aberto={buscaAberta}
        onOpenChange={setBuscaAberta}
        vehicleId={vehicle.id}
        categorias={categoriasPorId}
        contas={contasComNome}
        moeda={moeda}
        onVinculado={() => router.refresh()}
      />

      <Dialog open={editandoPapelDe !== null} onOpenChange={(v) => !v && setEditandoPapelDe(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar papel do vínculo</DialogTitle>
          </DialogHeader>
          <Select value={novoPapel} onValueChange={(v) => setNovoPapel(v as VehicleLinkRole)}>
            <SelectTrigger className="w-full">
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
          <DialogFooter>
            <Button onClick={salvarTrocaPapel} disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
