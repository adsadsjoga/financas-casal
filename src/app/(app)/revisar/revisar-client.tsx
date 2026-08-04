"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardCheck, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListEmpty } from "@/components/app/list-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { dataBR } from "@/lib/dates";
import type {
  Account,
  Category,
  Profile,
  Transaction,
} from "@/lib/database.types";

import {
  marcarComoRevisada,
  revisarComCategoria,
  revisarEmMassa,
} from "./actions";

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

const ORDENS: Array<{ value: string; label: string }> = [
  { value: "recente", label: "Mais recentes" },
  { value: "antigo", label: "Mais antigos" },
  { value: "maior", label: "Maior valor" },
  { value: "menor", label: "Menor valor" },
];

interface Filtros {
  pessoa: string;
  tipo: string;
  conta: string;
  busca: string;
  valor: string;
  ordenar: string;
}

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
  ordenar: string;
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
  ordenar,
  moedaCasal,
}: Props) {
  const router = useRouter();
  const [filtros, setFiltros] = useState<Filtros>({
    pessoa: filtroPessoa,
    tipo: filtroTipo,
    conta: filtroConta,
    busca,
    valor,
    ordenar,
  });
  const filtrosRef = useRef(filtros);
  useEffect(() => {
    filtrosRef.current = filtros;
  });
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  // Ressincroniza o estado local quando a navegação muda os filtros por fora
  // (botão "Limpar", voltar do navegador, cliques em "mais repetidos"). Ajuste
  // durante a renderização (padrão recomendado pelo React), não em efeito.
  const chaveFiltrosAplicados = `${filtroPessoa}|${filtroTipo}|${filtroConta}|${busca}|${valor}|${ordenar}`;
  const [chaveSincronizada, setChaveSincronizada] = useState(
    chaveFiltrosAplicados,
  );
  if (chaveSincronizada !== chaveFiltrosAplicados) {
    setChaveSincronizada(chaveFiltrosAplicados);
    setFiltros({
      pessoa: filtroPessoa,
      tipo: filtroTipo,
      conta: filtroConta,
      busca,
      valor,
      ordenar,
    });
  }

  const contasPorId = useMemo(
    () => new Map(contas.map((c) => [c.id, c])),
    [contas],
  );

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

  function paramsFor(f: Filtros) {
    const p = new URLSearchParams();
    if (f.pessoa) p.set("pessoa", f.pessoa);
    if (f.busca) p.set("busca", f.busca);
    if (f.valor) p.set("valor", f.valor);
    if (f.tipo) p.set("tipo", f.tipo);
    if (f.conta) p.set("conta", f.conta);
    if (f.ordenar && f.ordenar !== "recente") p.set("ordenar", f.ordenar);
    return p;
  }

  function aplicarFiltros(next: Filtros) {
    setFiltros(next);
    router.push(`/revisar?${paramsFor(next).toString()}`);
  }

  function mudarPessoa(pessoa: string) {
    aplicarFiltros({ ...filtros, pessoa });
  }

  function mudarTipo(tipo: string) {
    aplicarFiltros({ ...filtros, tipo });
  }

  function mudarConta(conta: string) {
    aplicarFiltros({ ...filtros, conta });
  }

  function mudarOrdenar(novaOrdem: string) {
    aplicarFiltros({ ...filtros, ordenar: novaOrdem });
  }

  function mudarBusca(texto: string) {
    setFiltros((f) => ({
      ...f,
      busca: texto,
      valor: texto.trim() ? "" : f.valor,
    }));
  }

  function mudarValor(texto: string) {
    setFiltros((f) => ({
      ...f,
      valor: texto,
      busca: texto.trim() ? "" : f.busca,
    }));
  }

  // Busca e valor aplicam sozinhos depois de uma pausa na digitação, em vez
  // de exigir um botão "Filtrar" — mas só quando realmente mudaram em relação
  // ao que já está aplicado, para não disparar navegação à toa.
  useEffect(() => {
    if (filtros.busca === busca && filtros.valor === valor) return;
    const t = setTimeout(() => {
      router.push(`/revisar?${paramsFor(filtrosRef.current).toString()}`);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.busca, filtros.valor]);

  function filtrarPorDescricao(desc: string) {
    aplicarFiltros({ ...filtros, busca: desc, valor: "" });
  }

  function filtrarPorValor(cents: number) {
    const texto = (cents / 100).toFixed(2).replace(".", ",");
    aplicarFiltros({ ...filtros, valor: texto, busca: "" });
  }

  function removerFiltro(campo: keyof Filtros) {
    aplicarFiltros({
      ...filtros,
      [campo]: campo === "ordenar" ? "recente" : "",
    });
  }

  function limparTudo() {
    aplicarFiltros({
      pessoa: "",
      tipo: "",
      conta: "",
      busca: "",
      valor: "",
      ordenar: "recente",
    });
  }

  const filtrosAtivos = Boolean(
    filtroPessoa || busca || valor || filtroTipo || filtroConta,
  );

  const chips = useMemo(() => {
    const lista: Array<{ key: keyof Filtros; label: string }> = [];
    if (filtroPessoa) {
      const nome = membros.find((m) => m.profile_id === filtroPessoa)?.profile
        .display_name;
      lista.push({ key: "pessoa", label: `Pessoa: ${nome ?? filtroPessoa}` });
    }
    if (filtroTipo) {
      const label =
        TIPOS.find((t) => t.value === filtroTipo)?.label ?? filtroTipo;
      lista.push({ key: "tipo", label: `Tipo: ${label}` });
    }
    if (filtroConta) {
      const nome = contas.find((c) => c.id === filtroConta)?.name;
      lista.push({ key: "conta", label: `Conta: ${nome ?? filtroConta}` });
    }
    if (busca) lista.push({ key: "busca", label: `Busca: ${busca}` });
    if (valor) lista.push({ key: "valor", label: `Valor: ${valor}` });
    return lista;
  }, [filtroPessoa, filtroTipo, filtroConta, busca, valor, membros, contas]);

  return (
    <PageShell className="pb-8">
      <PageHeader
        sobretitulo="Manutenção"
        titulo="Revisar categorias"
        descricao='Lançamentos importados em massa que caíram numa categoria genérica. Escolha a categoria certa, ou confirme que "Outras despesas/receitas" está correto mesmo.'
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {membros.length > 1 && (
            <Select
              value={filtroPessoa || "todas"}
              onValueChange={(v) => mudarPessoa(v === "todas" ? "" : v)}
            >
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
          <Select
            value={filtroTipo || "todos"}
            onValueChange={(v) => mudarTipo(v === "todos" ? "" : v)}
          >
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
          <Select
            value={filtroConta || "todas"}
            onValueChange={(v) => mudarConta(v === "todas" ? "" : v)}
          >
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
          <Select value={filtros.ordenar} onValueChange={mudarOrdenar}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              {ORDENS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[160px] flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
            <Input
              value={filtros.busca}
              onChange={(e) => mudarBusca(e.target.value)}
              placeholder="Buscar por descrição..."
              className="pl-8"
            />
          </div>
          <Input
            value={filtros.valor}
            onChange={(e) => mudarValor(e.target.value)}
            placeholder="Valor exato (ex: 12,50)"
            inputMode="decimal"
            className="w-[170px]"
          />
          {filtrosAtivos && (
            <Button variant="ghost" size="sm" onClick={limparTudo}>
              <X className="size-4" />
              Limpar tudo
            </Button>
          )}
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => removerFiltro(chip.key)}
                className="bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
              >
                {chip.label}
                <X className="size-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {!filtrosAtivos &&
        (maisRepetidos.descricoes.length > 0 ||
          maisRepetidos.valores.length > 0) && (
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
                    {formatMoney(cents, moedaCasal)}{" "}
                    <span className="text-muted-foreground">×{n}</span>
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
        <ListEmpty
          icone={<ClipboardCheck className="size-6 text-emerald-600" />}
          titulo={
            filtrosAtivos ? "Nada aqui com esse filtro." : "Tudo revisado."
          }
          descricao={
            filtrosAtivos
              ? "Tenta limpar o filtro."
              : "Sem lançamentos pendentes de categoria no momento."
          }
        />
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {transacoes.length} lançamento{transacoes.length === 1 ? "" : "s"}{" "}
            pendente
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
                iguaisNaLista={
                  contagemPorDescricao.get(
                    (t.description || "").trim().toLowerCase(),
                  ) ?? 0
                }
                onSelecionarIguais={() => selecionarIguais(t.description || "")}
              />
            ))}
          </div>
        </>
      )}
    </PageShell>
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
  const opcoes = tipoUnico
    ? categorias.filter((c) => c.kind === tipoUnico)
    : [];

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
            {transacoes.length} selecionados, mas misturam receita e despesa —
            revise item a item abaixo.
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
          {transacoes.length} selecionado{transacoes.length === 1 ? "" : "s"} —
          aplicar categoria:
        </p>
        <Select
          value={categoriaEscolhida}
          onValueChange={setCategoriaEscolhida}
        >
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
        <Button
          size="sm"
          onClick={aplicar}
          disabled={!categoriaEscolhida || pending}
        >
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
  const [categoriaEscolhida, setCategoriaEscolhida] = useState(
    transacao.category_id ?? "",
  );

  const opcoes = categorias.filter((c) => c.kind === transacao.type);
  const mudou =
    categoriaEscolhida && categoriaEscolhida !== transacao.category_id;

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
    <Card
      className={selecionada ? "border-primary/50 bg-primary/5" : undefined}
    >
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
              <p className="truncate font-medium">
                {transacao.description || "Sem descrição"}
              </p>
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
              (transacao.type === "receita"
                ? "text-emerald-600"
                : "text-rose-600")
            }
          >
            {transacao.type === "receita" ? "+" : "-"}
            {formatMoney(transacao.amount_cents, conta?.currency ?? moedaCasal)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={categoriaEscolhida}
            onValueChange={setCategoriaEscolhida}
          >
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
            <Button
              size="sm"
              variant="outline"
              onClick={confirmarAssim}
              disabled={pending}
            >
              Confirmar assim
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
