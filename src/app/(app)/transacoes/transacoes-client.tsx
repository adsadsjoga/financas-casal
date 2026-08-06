"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Plus,
  Scissors,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListCard, ListRow } from "@/components/app/list-card";
import { MoneyInput } from "@/components/app/money-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney, parseBRL } from "@/lib/money";
import { addDias, addMeses, dataBR, nomeDoMes } from "@/lib/dates";
import type { ModoPeriodo, Periodo } from "@/lib/periodo";
import type {
  Account,
  Category,
  Project,
  Transaction,
  TxType,
} from "@/lib/database.types";

import { dividirTransacao, excluirTransacao } from "./actions";
import { TransacaoSheet, type MembroSimples } from "./transacao-sheet";
import { ExportarTransacoesDialog } from "./exportar-transacoes-dialog";

const MODOS_PERIODO: { valor: ModoPeriodo; label: string }[] = [
  { valor: "mes", label: "Mês" },
  { valor: "ano", label: "Ano" },
  { valor: "dia", label: "Dia" },
  { valor: "intervalo", label: "Período" },
];

export function TransacoesClient({
  transacoes,
  temMais,
  limite,
  totaisMes,
  contas,
  categorias,
  membros,
  usuarioId,
  periodo,
  filtroConta,
  filtroCategoria,
  filtroPessoa,
  filtroTipo,
  busca,
  moedaCasal,
  projetos,
  vinculosProjetos,
  splitsPorTransacao,
}: {
  transacoes: Transaction[];
  temMais: boolean;
  limite: number;
  totaisMes: Array<{ type: string; amount_primary_cents: number }>;
  contas: Account[];
  categorias: Category[];
  membros: MembroSimples[];
  usuarioId: string;
  periodo: Periodo;
  filtroConta: string;
  filtroCategoria: string;
  filtroPessoa: string;
  filtroTipo: TxType | "";
  busca: string;
  moedaCasal: string;
  projetos: Project[];
  vinculosProjetos: Array<{ project_id: string; transaction_id: string }>;
  /** transaction_id -> shares de cada pessoa, só pra quem está dividida. */
  splitsPorTransacao: Record<string, Array<{ profile_id: string; share_cents: number }>>;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [sheetAberto, setSheetAberto] = useState(false);
  const [editando, setEditando] = useState<Transaction | null>(null);
  const [divisaoAberta, setDivisaoAberta] = useState<string | null>(null);
  const [buscaInput, setBuscaInput] = useState(busca);
  const [dividindo, setDividindo] = useState<Transaction | null>(null);
  const [valorPrimeiraParte, setValorPrimeiraParte] = useState("");

  const mapaContas = new Map(contas.map((c) => [c.id, c]));
  const mapaCategorias = new Map(categorias.map((c) => [c.id, c]));

  const filtrosAtivos = Boolean(
    filtroConta || filtroCategoria || filtroPessoa || filtroTipo || busca,
  );

  // Os totais somam na moeda do casal; cada linha mostra a moeda da sua conta.
  const entradas = totaisMes
    .filter((t) => t.type === "receita")
    .reduce((a, t) => a + t.amount_primary_cents, 0);
  const saidas = totaisMes
    .filter((t) => t.type === "despesa")
    .reduce((a, t) => a + t.amount_primary_cents, 0);

  function paramsBase() {
    const p = new URLSearchParams();
    p.set("modo", periodo.modo);
    if (periodo.modo === "mes") p.set("mes", periodo.de);
    else if (periodo.modo === "ano") p.set("ano", periodo.referencia);
    else if (periodo.modo === "dia") p.set("dia", periodo.de);
    else if (periodo.modo === "intervalo") {
      p.set("de", periodo.de);
      p.set("ate", periodo.ateIntervalo ?? periodo.de);
    }
    if (filtroConta) p.set("conta", filtroConta);
    if (filtroCategoria) p.set("categoria", filtroCategoria);
    if (filtroPessoa) p.set("pessoa", filtroPessoa);
    if (filtroTipo) p.set("tipo", filtroTipo);
    if (busca) p.set("busca", busca);
    return p;
  }

  function ir(p: URLSearchParams) {
    router.push(`/transacoes?${p}`);
  }

  function mudarModo(novoModo: ModoPeriodo) {
    const p = new URLSearchParams();
    p.set("modo", novoModo);
    if (filtroConta) p.set("conta", filtroConta);
    if (filtroCategoria) p.set("categoria", filtroCategoria);
    if (filtroPessoa) p.set("pessoa", filtroPessoa);
    if (filtroTipo) p.set("tipo", filtroTipo);
    if (busca) p.set("busca", busca);
    ir(p);
  }

  function navegar(delta: number) {
    const p = paramsBase();
    if (periodo.modo === "mes") p.set("mes", addMeses(periodo.de, delta));
    else if (periodo.modo === "ano") p.set("ano", String(Number(periodo.referencia) + delta));
    else if (periodo.modo === "dia") p.set("dia", addDias(periodo.de, delta));
    ir(p);
  }

  function mudarDia(valor: string) {
    if (!valor) return;
    const p = paramsBase();
    p.set("dia", valor);
    ir(p);
  }

  function mudarIntervalo(de: string, ate: string) {
    if (!de || !ate) return;
    const p = paramsBase();
    p.set("de", de);
    p.set("ate", ate);
    ir(p);
  }

  function mudarConta(valor: string) {
    const p = paramsBase();
    if (valor === "todas") p.delete("conta");
    else p.set("conta", valor);
    ir(p);
  }

  function mudarCategoria(valor: string) {
    const p = paramsBase();
    if (valor === "todas") p.delete("categoria");
    else p.set("categoria", valor);
    ir(p);
  }

  function mudarPessoa(valor: string) {
    const p = paramsBase();
    if (valor === "todas") p.delete("pessoa");
    else p.set("pessoa", valor);
    ir(p);
  }

  function mudarTipo(valor: string) {
    const p = paramsBase();
    if (valor === "todos") p.delete("tipo");
    else p.set("tipo", valor);
    ir(p);
  }

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const p = paramsBase();
    if (buscaInput.trim()) p.set("busca", buscaInput.trim());
    else p.delete("busca");
    ir(p);
  }

  function limparFiltros() {
    setBuscaInput("");
    const p = new URLSearchParams();
    p.set("modo", periodo.modo);
    if (periodo.modo === "mes") p.set("mes", periodo.de);
    else if (periodo.modo === "ano") p.set("ano", periodo.referencia);
    else if (periodo.modo === "dia") p.set("dia", periodo.de);
    else if (periodo.modo === "intervalo") {
      p.set("de", periodo.de);
      p.set("ate", periodo.ateIntervalo ?? periodo.de);
    }
    ir(p);
  }

  function mostrarMais() {
    const p = paramsBase();
    p.set("limite", String(Math.min(limite + 120, 1000)));
    ir(p);
  }

  function rotuloPeriodo(): string {
    if (periodo.modo === "ano") return `no ano de ${periodo.referencia}`;
    if (periodo.modo === "dia") return `em ${dataBR(periodo.de)}`;
    if (periodo.modo === "intervalo") return "nesse período";
    return `em ${nomeDoMes(periodo.de)}`;
  }

  function abrirNovo() {
    setEditando(null);
    setSheetAberto(true);
  }

  function abrirEdicao(t: Transaction) {
    setEditando(t);
    setSheetAberto(true);
  }

  function excluir(t: Transaction, grupoInteiro: boolean) {
    startTransition(async () => {
      const r = await excluirTransacao(t.id, grupoInteiro);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui excluir.");
        return;
      }
      toast.success(
        grupoInteiro ? "Parcelas excluídas." : "Lançamento excluído.",
      );
      router.refresh();
    });
  }

  function abrirDivisao(t: Transaction) {
    setDividindo(t);
    setValorPrimeiraParte("");
  }

  function confirmarDivisao(e: React.FormEvent) {
    e.preventDefault();
    if (!dividindo) return;
    const cents = parseBRL(valorPrimeiraParte);
    if (cents === null || cents <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    if (cents >= dividindo.amount_cents) {
      toast.error("O valor precisa ser menor que o total do lançamento.");
      return;
    }
    startTransition(async () => {
      const r = await dividirTransacao(dividindo.id, cents);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui dividir.");
        return;
      }
      toast.success("Lançamento dividido em dois.");
      setDividindo(null);
      router.refresh();
    });
  }

  return (
    <PageShell>
      <PageHeader
        titulo="Transações"
        descricao={
          <>
            <span className="text-emerald-600">
              +{formatMoney(entradas, moedaCasal)}
            </span>
            {"  ·  "}
            <span className="text-rose-600">
              −{formatMoney(saidas, moedaCasal)}
            </span>
            {"  ·  sobrou "}
            {formatMoney(entradas - saidas, moedaCasal)}
          </>
        }
        acao={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ExportarTransacoesDialog contas={contas} />
            <Button onClick={abrirNovo} disabled={contas.length === 0}>
              <Plus className="size-4" />
              Novo
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={periodo.modo} onValueChange={(v) => mudarModo(v as ModoPeriodo)}>
          <SelectTrigger className="h-8 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODOS_PERIODO.map((m) => (
              <SelectItem key={m.valor} value={m.valor}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(periodo.modo === "mes" || periodo.modo === "ano" || periodo.modo === "dia") && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => navegar(-1)}
              aria-label="Anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            {periodo.modo === "dia" ? (
              <Input
                type="date"
                className="h-8 w-36"
                value={periodo.de}
                onChange={(e) => mudarDia(e.target.value)}
              />
            ) : (
              <span className="min-w-28 text-center text-sm font-medium">
                {periodo.modo === "ano" ? periodo.referencia : nomeDoMes(periodo.de)}
              </span>
            )}
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => navegar(1)}
              aria-label="Próximo"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}

        {periodo.modo === "intervalo" && (
          <div className="flex items-center gap-1">
            <Input
              type="date"
              className="h-8 w-36"
              value={periodo.de}
              onChange={(e) => mudarIntervalo(e.target.value, periodo.ateIntervalo ?? periodo.de)}
            />
            <span className="text-muted-foreground text-xs">até</span>
            <Input
              type="date"
              className="h-8 w-36"
              value={periodo.ateIntervalo ?? periodo.de}
              onChange={(e) => mudarIntervalo(periodo.de, e.target.value)}
            />
          </div>
        )}

        <Select value={filtroTipo || "todos"} onValueChange={mudarTipo}>
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Débito e crédito</SelectItem>
            <SelectItem value="receita">Só crédito</SelectItem>
            <SelectItem value="despesa">Só débito</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroConta || "todas"} onValueChange={mudarConta}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as contas</SelectItem>
            {contas.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtroCategoria || "todas"}
          onValueChange={mudarCategoria}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.icon} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {membros.length > 1 && (
          <Select value={filtroPessoa || "todas"} onValueChange={mudarPessoa}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos</SelectItem>
              {membros.map((m) => (
                <SelectItem key={m.profile_id} value={m.profile_id}>
                  {m.profile.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <form onSubmit={buscar} className="flex items-center gap-1">
          <Input
            value={buscaInput}
            onChange={(e) => setBuscaInput(e.target.value)}
            placeholder="Buscar descrição…"
            className="h-8 w-40"
          />
          <Button
            type="submit"
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Buscar"
          >
            <Search className="size-4" />
          </Button>
        </form>

        {filtrosAtivos && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={limparFiltros}
          >
            <X className="size-4" />
            Limpar
          </Button>
        )}
      </div>

      {transacoes.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Mostrando {transacoes.length} lançamentos {rotuloPeriodo()}
          {temMais ? " por enquanto" : ""}.
        </p>
      )}

      {contas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">Cadastre uma conta primeiro</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Todo lançamento precisa sair de alguma conta.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <a href="/contas">Ir para contas</a>
            </Button>
          </CardContent>
        </Card>
      ) : transacoes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">Nenhum lançamento {rotuloPeriodo()}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Lance na mão ou importe o extrato do banco.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ListCard>
          {transacoes.map((t) => {
            const conta = mapaContas.get(t.account_id);
            const categoria = t.category_id
              ? mapaCategorias.get(t.category_id)
              : null;
            const destino = t.transfer_account_id
              ? mapaContas.get(t.transfer_account_id)
              : null;
            const sinal =
              t.type === "receita" ? "+" : t.type === "despesa" ? "−" : "";
            const cor =
              t.type === "receita"
                ? "text-emerald-600"
                : t.type === "despesa"
                  ? "text-rose-600"
                  : "text-muted-foreground";

            return (
              <ListRow key={t.id}>
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
                    {t.split_mode !== "none" && (
                      <button
                        type="button"
                        onClick={() =>
                          setDivisaoAberta((atual) => (atual === t.id ? null : t.id))
                        }
                      >
                        <Badge
                          variant="secondary"
                          className="shrink-0 cursor-pointer font-normal"
                        >
                          dividida
                        </Badge>
                      </button>
                    )}
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {dataBR(t.occurred_on)} · {conta?.name ?? "—"}
                    {destino && (
                      <>
                        {" "}
                        <ArrowLeftRight className="inline size-3" />{" "}
                        {destino.name}
                      </>
                    )}
                    {categoria && ` · ${categoria.icon} ${categoria.name}`}
                  </p>
                  {divisaoAberta === t.id && (
                    <div className="bg-muted/50 mt-1.5 space-y-0.5 rounded-md border p-2 text-xs">
                      {(splitsPorTransacao[t.id] ?? []).length === 0 ? (
                        <p className="text-muted-foreground">
                          Sem divisão gravada pra esse lançamento ainda.
                        </p>
                      ) : (
                        (splitsPorTransacao[t.id] ?? []).map((s) => {
                          const m = membros.find((x) => x.profile_id === s.profile_id);
                          return (
                            <div key={s.profile_id} className="flex justify-between gap-2">
                              <span className="text-muted-foreground">
                                {m?.profile.display_name ?? "—"}
                              </span>
                              <span className="tabular-nums">
                                {formatMoney(s.share_cents, conta?.currency ?? moedaCasal)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <span
                  className={`shrink-0 text-sm font-medium tabular-nums ${cor}`}
                >
                  {sinal}
                  {formatMoney(t.amount_cents, conta?.currency ?? moedaCasal)}
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                    >
                      <MoreVertical className="size-4" />
                      <span className="sr-only">Ações</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => abrirEdicao(t)}>
                      <Pencil className="size-4" />
                      Editar
                    </DropdownMenuItem>
                    {t.type !== "transferencia" && (
                      <DropdownMenuItem onSelect={() => abrirDivisao(t)}>
                        <Scissors className="size-4" />
                        Dividir em duas
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onSelect={() => excluir(t, false)}
                      disabled={pendente}
                      variant="destructive"
                    >
                      <Trash2 className="size-4" />
                      Excluir
                    </DropdownMenuItem>
                    {t.installment_group_id && (
                      <DropdownMenuItem
                        onSelect={() => excluir(t, true)}
                        disabled={pendente}
                        variant="destructive"
                      >
                        <Trash2 className="size-4" />
                        Excluir as {t.installment_total} parcelas
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </ListRow>
            );
          })}
        </ListCard>
      )}

      {temMais && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={mostrarMais}
        >
          Mostrar mais lancamentos
        </Button>
      )}

      {sheetAberto && (
        <TransacaoSheet
          aberto={sheetAberto}
          onOpenChange={setSheetAberto}
          transacao={editando}
          contas={contas}
          categorias={categorias}
          membros={membros}
          usuarioId={usuarioId}
          moedaCasal={moedaCasal}
          projetos={projetos}
          projetosDaTransacao={
            editando
              ? vinculosProjetos
                  .filter((v) => v.transaction_id === editando.id)
                  .map((v) => v.project_id)
              : []
          }
        />
      )}

      <Dialog open={!!dividindo} onOpenChange={(v) => !v && setDividindo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dividir lançamento</DialogTitle>
          </DialogHeader>
          {dividindo && (
            <form onSubmit={confirmarDivisao} className="space-y-4">
              <p className="text-muted-foreground text-sm">
                {dividindo.description || "Sem descrição"} ·{" "}
                {formatMoney(dividindo.amount_cents, mapaContas.get(dividindo.account_id)?.currency ?? moedaCasal)}
              </p>
              <MoneyInput
                label="Valor da primeira parte"
                value={valorPrimeiraParte}
                onChange={setValorPrimeiraParte}
                currency={mapaContas.get(dividindo.account_id)?.currency ?? moedaCasal}
                required
              />
              <p className="text-muted-foreground text-xs">
                O resto vira um segundo lançamento, na mesma conta, data e
                categoria — dá pra editar cada um depois.
              </p>
              <DialogFooter>
                <Button type="submit" disabled={pendente}>
                  {pendente ? "Dividindo…" : "Dividir"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
