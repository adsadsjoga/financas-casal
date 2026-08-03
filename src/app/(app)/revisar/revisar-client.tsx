"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardCheck, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { dataBR } from "@/lib/dates";
import type { Account, Category, Profile, Transaction } from "@/lib/database.types";

import { marcarComoRevisada, revisarComCategoria, revisarEmMassa } from "./actions";

interface Pendente {
  id: string;
  description: string | null;
  amount_cents: number;
}

const TIPOS: Array<{ value: Transaction["type"]; label: string }> = [
  { value: "despesa", label: "Despesa" },
  { value: "receita", label: "Receita" },
  { value: "transferencia", label: "Transferência" },
];

interface Props {
  transacoes: Transaction[];
  todasPendentes: Pendente[];
  contas: Account[];
  categorias: Category[];
  membros: Array<{ profile_id: string; profile: Profile }>;
  filtroPessoa: string;
  busca: string;
  valor: string;
  filtroTipo: string;
  filtroConta: string;
  moedaCasal: string;
}

export function RevisarClient({
  transacoes,
  todasPendentes,
  contas,
  categorias,
  membros,
  filtroPessoa,
  busca,
  valor,
  filtroTipo,
  filtroConta,
  moedaCasal,
}: Props) {
  const router = useRouter();
  const [buscaLocal, setBuscaLocal] = useState(busca);
  const [valorLocal, setValorLocal] = useState(valor);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const contasPorId = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);

  const contagemPorDescricao = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of transacoes) {
      const d = (t.description || "").trim().toLowerCase();
      if (!d) continue;
      m.set(d, (m.get(d) ?? 0) + 1);
    }
    return m;
  }, [transacoes]);

  function toggleSelecao(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selecionarIguais(desc: string) {
    const alvo = desc.trim().toLowerCase();
    setSelecionados((prev) => {
      const next = new Set(prev);
      for (const t of transacoes) {
        if ((t.description || "").trim().toLowerCase() === alvo) next.add(t.id);
      }
      return next;
    });
  }

  function selecionarTodosVisiveis() {
    setSelecionados(new Set(transacoes.map((t) => t.id)));
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  const transacoesSelecionadas = useMemo(
    () => transacoes.filter((t) => selecionados.has(t.id)),
    [transacoes, selecionados],
  );

  const maisRepetidos = useMemo(() => {
    const porDescricao = new Map<string, number>();
    const porValor = new Map<number, number>();
    for (const t of todasPendentes) {
      const desc = (t.description || "").trim();
      if (desc) porDescricao.set(desc, (porDescricao.get(desc) ?? 0) + 1);
      porValor.set(t.amount_cents, (porValor.get(t.amount_cents) ?? 0) + 1);
    }
    const descricoes = [...porDescricao.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const valores = [...porValor.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    return { descricoes, valores };
  }, [todasPendentes]);

  function paramsBase() {
    const p = new URLSearchParams();
    if (filtroPessoa) p.set("pessoa", filtroPessoa);
    if (busca) p.set("busca", busca);
    if (valor) p.set("valor", valor);
    if (filtroTipo) p.set("tipo", filtroTipo);
    if (filtroConta) p.set("conta", filtroConta);
    return p;
  }

  function mudarPessoa(pessoa: string) {
    const p = paramsBase();
    if (pessoa) p.set("pessoa", pessoa);
    else p.delete("pessoa");
    router.push(`/revisar?${p.toString()}`);
  }

  function mudarTipo(tipo: string) {
    const p = paramsBase();
    if (tipo) p.set("tipo", tipo);
    else p.delete("tipo");
    router.push(`/revisar?${p.toString()}`);
  }

  function mudarConta(conta: string) {
    const p = paramsBase();
    if (conta) p.set("conta", conta);
    else p.delete("conta");
    router.push(`/revisar?${p.toString()}`);
  }

  function buscar(e?: React.FormEvent) {
    e?.preventDefault();
    const p = paramsBase();
    if (buscaLocal.trim()) p.set("busca", buscaLocal.trim());
    else p.delete("busca");
    if (valorLocal.trim()) p.set("valor", valorLocal.trim());
    else p.delete("valor");
    router.push(`/revisar?${p.toString()}`);
  }

  function filtrarPorDescricao(desc: string) {
    setBuscaLocal(desc);
    setValorLocal("");
    const p = paramsBase();
    p.set("busca", desc);
    p.delete("valor");
    router.push(`/revisar?${p.toString()}`);
  }

  function filtrarPorValor(cents: number) {
    const texto = (cents / 100).toFixed(2).replace(".", ",");
    setValorLocal(texto);
    setBuscaLocal("");
    const p = paramsBase();
    p.set("valor", texto);
    p.delete("busca");
    router.push(`/revisar?${p.toString()}`);
  }

  const filtrosAtivos = Boolean(filtroPessoa || busca || valor || filtroTipo || filtroConta);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div>
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.14em]">
          Manutenção
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Revisar categorias</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Lançamentos importados em massa que caíram numa categoria genérica.
          Escolha a categoria certa, ou confirme que “Outras despesas/receitas”
          está correto mesmo.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {membros.length > 1 && (
          <Select value={filtroPessoa || "todas"} onValueChange={(v) => mudarPessoa(v === "todas" ? "" : v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Pessoa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as pessoas</SelectItem>
              {membros.map((m) => (
                <SelectItem key={m.profile_id} value={m.profile_id}>
                  {m.profile.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={filtroTipo || "todos"} onValueChange={(v) => mudarTipo(v === "todos" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroConta || "todas"} onValueChange={(v) => mudarConta(v === "todas" ? "" : v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Conta" />
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
        <form onSubmit={buscar} className="flex min-w-[200px] flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[160px] flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
            <Input
              value={buscaLocal}
              onChange={(e) => setBuscaLocal(e.target.value)}
              placeholder="Buscar por descrição..."
              className="pl-8"
            />
          </div>
          <Input
            value={valorLocal}
            onChange={(e) => setValorLocal(e.target.value)}
            placeholder="Valor exato (ex: 12,50)"
            inputMode="decimal"
            className="w-[170px]"
          />
          <Button type="submit" size="sm" variant="secondary">
            Filtrar
          </Button>
        </form>
        {filtrosAtivos && (
          <Button variant="ghost" size="sm" onClick={() => router.push("/revisar")}>
            <X className="size-4" />
            Limpar
          </Button>
        )}
      </div>

      {!filtrosAtivos && (maisRepetidos.descricoes.length > 0 || maisRepetidos.valores.length > 0) && (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.1em]">
            Mais repetidos — clique para filtrar e preencher em lote
          </p>
          {maisRepetidos.descricoes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {maisRepetidos.descricoes.map(([desc, n]) => (
                <button
                  key={desc}
                  type="button"
                  onClick={() => filtrarPorDescricao(desc)}
                  className="bg-muted hover:bg-muted/70 rounded-full px-2.5 py-1 text-xs"
                >
                  {desc} <span className="text-muted-foreground">×{n}</span>
                </button>
              ))}
            </div>
          )}
          {maisRepetidos.valores.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {maisRepetidos.valores.map(([cents, n]) => (
                <button
                  key={cents}
                  type="button"
                  onClick={() => filtrarPorValor(cents)}
                  className="bg-muted hover:bg-muted/70 rounded-full px-2.5 py-1 text-xs tabular-nums"
                >
                  {formatMoney(cents, moedaCasal)} <span className="text-muted-foreground">×{n}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {transacoes.length > 1 && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={selecionarTodosVisiveis}
            className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
          >
            Selecionar todos os {transacoes.length} visíveis
          </button>
        </div>
      )}

      {selecionados.size > 0 && (
        <AplicarEmMassa
          transacoes={transacoesSelecionadas}
          categorias={categorias}
          onLimpar={limparSelecao}
          onSucesso={limparSelecao}
        />
      )}

      {transacoes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="bg-emerald-500/10 flex size-12 items-center justify-center rounded-full">
              <ClipboardCheck className="size-6 text-emerald-600" />
            </span>
            <div>
              <p className="font-medium">
                {filtrosAtivos ? "Nada aqui com esse filtro." : "Tudo revisado."}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {filtrosAtivos
                  ? "Tenta limpar o filtro."
                  : "Sem lançamentos pendentes de categoria no momento."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {transacoes.length} lançamento{transacoes.length === 1 ? "" : "s"} pendente
            {transacoes.length === 1 ? "" : "s"}
          </p>
          <div className="space-y-2">
            {transacoes.map((t) => (
              <LinhaRevisao
                key={t.id}
                transacao={t}
                conta={contasPorId.get(t.account_id)}
                categorias={categorias}
                moedaCasal={moedaCasal}
                selecionada={selecionados.has(t.id)}
                onToggleSelecao={() => toggleSelecao(t.id)}
                iguaisNaLista={contagemPorDescricao.get((t.description || "").trim().toLowerCase()) ?? 0}
                onSelecionarIguais={() => selecionarIguais(t.description || "")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AplicarEmMassa({
  transacoes,
  categorias,
  onLimpar,
  onSucesso,
}: {
  transacoes: Transaction[];
  categorias: Category[];
  onLimpar: () => void;
  onSucesso: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [categoriaEscolhida, setCategoriaEscolhida] = useState("");

  const tipos = new Set(transacoes.map((t) => t.type));
  const tipoUnico = tipos.size === 1 ? [...tipos][0] : null;
  const opcoes = tipoUnico ? categorias.filter((c) => c.kind === tipoUnico) : [];

  function aplicar() {
    if (!categoriaEscolhida) return;
    startTransition(async () => {
      const r = await revisarEmMassa(
        transacoes.map((t) => t.id),
        categoriaEscolhida,
      );
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar em lote.");
        return;
      }
      toast.success(`${r.atualizados} lançamentos atualizados.`);
      setCategoriaEscolhida("");
      onSucesso();
    });
  }

  if (!tipoUnico) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
          <p className="text-muted-foreground text-xs">
            {transacoes.length} selecionados, mas misturam receita e despesa — revise item a
            item abaixo.
          </p>
          <Button variant="ghost" size="sm" onClick={onLimpar}>
            <X className="size-4" />
            Limpar seleção
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-wrap items-center gap-2 p-3">
        <p className="text-sm font-medium">
          {transacoes.length} selecionado{transacoes.length === 1 ? "" : "s"} — aplicar
          categoria:
        </p>
        <Select value={categoriaEscolhida} onValueChange={setCategoriaEscolhida}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Escolher categoria" />
          </SelectTrigger>
          <SelectContent>
            {opcoes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.icon} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={aplicar} disabled={!categoriaEscolhida || pending}>
          <Check className="size-4" />
          Aplicar a todos
        </Button>
        <Button variant="ghost" size="sm" onClick={onLimpar}>
          <X className="size-4" />
          Limpar seleção
        </Button>
      </CardContent>
    </Card>
  );
}

function LinhaRevisao({
  transacao,
  conta,
  categorias,
  moedaCasal,
  selecionada,
  onToggleSelecao,
  iguaisNaLista,
  onSelecionarIguais,
}: {
  transacao: Transaction;
  conta: Account | undefined;
  categorias: Category[];
  moedaCasal: string;
  selecionada: boolean;
  onToggleSelecao: () => void;
  iguaisNaLista: number;
  onSelecionarIguais: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [categoriaEscolhida, setCategoriaEscolhida] = useState(transacao.category_id ?? "");

  const opcoes = categorias.filter((c) => c.kind === transacao.type);
  const mudou = categoriaEscolhida && categoriaEscolhida !== transacao.category_id;

  function salvar() {
    if (!categoriaEscolhida) return;
    startTransition(async () => {
      const r = await revisarComCategoria(transacao.id, categoriaEscolhida);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar.");
        return;
      }
      toast.success("Categoria atualizada.");
    });
  }

  function confirmarAssim() {
    startTransition(async () => {
      const r = await marcarComoRevisada(transacao.id);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui confirmar.");
        return;
      }
      toast.success("Confirmado como está.");
    });
  }

  return (
    <Card className={selecionada ? "border-primary/50 bg-primary/5" : undefined}>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <input
              type="checkbox"
              checked={selecionada}
              onChange={onToggleSelecao}
              className="mt-1 size-4 shrink-0 accent-primary"
              aria-label="Selecionar este lançamento"
            />
            <div className="min-w-0">
              <p className="truncate font-medium">{transacao.description || "Sem descrição"}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {dataBR(transacao.occurred_on)}
                {conta ? ` · ${conta.name}` : ""}
              </p>
              {iguaisNaLista > 1 && (
                <button
                  type="button"
                  onClick={onSelecionarIguais}
                  className="text-primary mt-1 text-xs underline underline-offset-2"
                >
                  Selecionar os {iguaisNaLista} com esse nome
                </button>
              )}
            </div>
          </div>
          <p
            className={
              "shrink-0 text-right text-sm font-semibold tabular-nums " +
              (transacao.type === "receita" ? "text-emerald-600" : "text-rose-600")
            }
          >
            {transacao.type === "receita" ? "+" : "-"}
            {formatMoney(transacao.amount_cents, conta?.currency ?? moedaCasal)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={categoriaEscolhida} onValueChange={setCategoriaEscolhida}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Escolher categoria" />
            </SelectTrigger>
            <SelectContent>
              {opcoes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mudou ? (
            <Button size="sm" onClick={salvar} disabled={pending}>
              <Check className="size-4" />
              Salvar
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={confirmarAssim} disabled={pending}>
              Confirmar assim
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
