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
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { formatMoney } from "@/lib/money";
import { addMeses, dataBR, nomeDoMes } from "@/lib/dates";
import type { Account, Category, Transaction } from "@/lib/database.types";

import { excluirTransacao } from "./actions";
import { TransacaoSheet, type MembroSimples } from "./transacao-sheet";

export function TransacoesClient({
  transacoes,
  temMais,
  limite,
  totaisMes,
  contas,
  categorias,
  membros,
  usuarioId,
  mes,
  filtroConta,
  filtroCategoria,
  filtroPessoa,
  busca,
  moedaCasal,
}: {
  transacoes: Transaction[];
  temMais: boolean;
  limite: number;
  totaisMes: Array<{ type: string; amount_primary_cents: number }>;
  contas: Account[];
  categorias: Category[];
  membros: MembroSimples[];
  usuarioId: string;
  mes: string;
  filtroConta: string;
  filtroCategoria: string;
  filtroPessoa: string;
  busca: string;
  moedaCasal: string;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [sheetAberto, setSheetAberto] = useState(false);
  const [editando, setEditando] = useState<Transaction | null>(null);
  const [buscaInput, setBuscaInput] = useState(busca);

  const mapaContas = new Map(contas.map((c) => [c.id, c]));
  const mapaCategorias = new Map(categorias.map((c) => [c.id, c]));

  const filtrosAtivos = Boolean(filtroConta || filtroCategoria || filtroPessoa || busca);

  // Os totais somam na moeda do casal; cada linha mostra a moeda da sua conta.
  const entradas = totaisMes
    .filter((t) => t.type === "receita")
    .reduce((a, t) => a + t.amount_primary_cents, 0);
  const saidas = totaisMes
    .filter((t) => t.type === "despesa")
    .reduce((a, t) => a + t.amount_primary_cents, 0);

  function paramsBase() {
    const p = new URLSearchParams();
    p.set("mes", mes);
    if (filtroConta) p.set("conta", filtroConta);
    if (filtroCategoria) p.set("categoria", filtroCategoria);
    if (filtroPessoa) p.set("pessoa", filtroPessoa);
    if (busca) p.set("busca", busca);
    return p;
  }

  function irParaMes(novoMes: string) {
    const p = paramsBase();
    p.set("mes", novoMes);
    router.push(`/transacoes?${p}`);
  }

  function mudarConta(valor: string) {
    const p = paramsBase();
    if (valor === "todas") p.delete("conta");
    else p.set("conta", valor);
    router.push(`/transacoes?${p}`);
  }

  function mudarCategoria(valor: string) {
    const p = paramsBase();
    if (valor === "todas") p.delete("categoria");
    else p.set("categoria", valor);
    router.push(`/transacoes?${p}`);
  }

  function mudarPessoa(valor: string) {
    const p = paramsBase();
    if (valor === "todas") p.delete("pessoa");
    else p.set("pessoa", valor);
    router.push(`/transacoes?${p}`);
  }

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const p = paramsBase();
    if (buscaInput.trim()) p.set("busca", buscaInput.trim());
    else p.delete("busca");
    router.push(`/transacoes?${p}`);
  }

  function limparFiltros() {
    setBuscaInput("");
    router.push(`/transacoes?mes=${mes}`);
  }

  function mostrarMais() {
    const p = paramsBase();
    p.set("limite", String(Math.min(limite + 120, 1000)));
    router.push(`/transacoes?${p}`);
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
      toast.success(grupoInteiro ? "Parcelas excluídas." : "Lançamento excluído.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transações</h1>
          <p className="text-muted-foreground text-sm">
            <span className="text-emerald-600">
              +{formatMoney(entradas, moedaCasal)}
            </span>
            {"  ·  "}
            <span className="text-rose-600">−{formatMoney(saidas, moedaCasal)}</span>
            {"  ·  sobrou "}
            {formatMoney(entradas - saidas, moedaCasal)}
          </p>
        </div>
        <Button onClick={abrirNovo} disabled={contas.length === 0}>
          <Plus className="size-4" />
          Novo
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => irParaMes(addMeses(mes, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium">
            {nomeDoMes(mes)}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => irParaMes(addMeses(mes, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

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

        <Select value={filtroCategoria || "todas"} onValueChange={mudarCategoria}>
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
          <Button type="submit" variant="outline" size="icon" className="size-8" aria-label="Buscar">
            <Search className="size-4" />
          </Button>
        </form>

        {filtrosAtivos && (
          <Button type="button" variant="ghost" size="sm" className="h-8" onClick={limparFiltros}>
            <X className="size-4" />
            Limpar
          </Button>
        )}
      </div>

      {transacoes.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Mostrando {transacoes.length} lancamentos do mes{temMais ? " por enquanto" : ""}.
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
            <p className="font-medium">Nenhum lançamento em {nomeDoMes(mes)}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Lance na mão ou importe o extrato do banco.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <CardContent className="divide-y p-0">
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
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
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
                        <Badge variant="secondary" className="shrink-0 font-normal">
                          dividida
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {dataBR(t.occurred_on)} · {conta?.name ?? "—"}
                      {destino && (
                        <>
                          {" "}
                          <ArrowLeftRight className="inline size-3" /> {destino.name}
                        </>
                      )}
                      {categoria && ` · ${categoria.icon} ${categoria.name}`}
                    </p>
                  </div>

                  <span className={`shrink-0 text-sm font-medium tabular-nums ${cor}`}>
                    {sinal}
                    {formatMoney(t.amount_cents, conta?.currency ?? moedaCasal)}
                  </span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 shrink-0">
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => abrirEdicao(t)}>
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
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
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {temMais && (
        <Button type="button" variant="outline" className="w-full" onClick={mostrarMais}>
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
        />
      )}
    </div>
  );
}
