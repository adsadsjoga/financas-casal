"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ClipboardCheck,
  Link2,
  Search,
  Unlink,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  InternalTransferLink,
  Profile,
  Transaction,
} from "@/lib/database.types";

import {
  desvincularTransferenciaInterna,
  marcarComoRevisada,
  revisarComCategoria,
  revisarEmMassa,
  vincularTransferenciaInterna,
} from "./actions";

interface Pendente {
  id: string;
  description: string | null;
  amount_cents: number;
}

export interface CategoriaResumo {
  category_id: string;
  nome: string;
  icon: string;
  kind: "receita" | "despesa";
  transacoes: number;
  pendentes: number;
  receitas_cents: number;
  despesas_cents: number;
  saldo_cents: number;
  ultima_data: string | null;
  fora_do_resultado: boolean;
  transferencia_interna: boolean;
}

const TIPOS: Array<{ value: Transaction["type"]; label: string }> = [
  { value: "despesa", label: "Despesa" },
  { value: "receita", label: "Receita" },
  { value: "transferencia", label: "Transferencia" },
];

const ORDENS: Array<{ value: string; label: string }> = [
  { value: "recente", label: "Mais recentes" },
  { value: "antigo", label: "Mais antigos" },
  { value: "maior", label: "Maior valor" },
  { value: "menor", label: "Menor valor" },
];

interface Props {
  aba: string;
  categoriaAtivaId: string;
  categoriaAtiva: Category | null;
  categoriasResumo: CategoriaResumo[];
  categoriaTransacoes: Transaction[];
  transacoes: Transaction[];
  todasPendentes: Pendente[];
  linksInternos: InternalTransferLink[];
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
  aba,
  categoriaAtivaId,
  categoriaAtiva,
  categoriasResumo,
  categoriaTransacoes,
  transacoes,
  todasPendentes,
  linksInternos,
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
  const contasPorId = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);
  const categoriasPorId = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias],
  );
  const abaAtual = aba === "pendentes" || aba === "internas" ? aba : "categorias";
  const ehInterna = Boolean(categoriaAtiva && categoriaEhTransferencia(categoriaAtiva));

  function params(next: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const base = {
      aba: abaAtual,
      categoria: categoriaAtivaId,
      pessoa: filtroPessoa,
      busca,
      valor,
      tipo: filtroTipo,
      conta: filtroConta,
      ordenar,
      ...next,
    };
    for (const [k, v] of Object.entries(base)) {
      if (!v || (k === "ordenar" && v === "recente")) continue;
      p.set(k, v);
    }
    return p.toString();
  }

  function navegar(next: Record<string, string | undefined>) {
    const qs = params(next);
    router.push(qs ? `/revisar?${qs}` : "/revisar");
  }

  const filtrosAtivos = Boolean(filtroPessoa || busca || valor || filtroTipo || filtroConta);

  return (
    <PageShell className="pb-8">
      <PageHeader
        sobretitulo="Conferencia"
        titulo="Conferir categorias"
        descricao="Abra uma categoria, veja todos os lancamentos e resolva pendencias ou transferencias que precisam bater entrada com saida."
      />

      <div className="flex flex-wrap gap-2">
        <TabButton ativo={abaAtual === "categorias"} onClick={() => navegar({ aba: "categorias" })}>
          Categorias
        </TabButton>
        <TabButton ativo={abaAtual === "internas"} onClick={() => navegar({ aba: "internas" })}>
          Transferencias internas
        </TabButton>
        <TabButton ativo={abaAtual === "pendentes"} onClick={() => navegar({ aba: "pendentes" })}>
          Pendentes ({transacoes.length})
        </TabButton>
      </div>

      <Filtros
        membros={membros}
        contas={contas}
        filtroPessoa={filtroPessoa}
        filtroTipo={filtroTipo}
        filtroConta={filtroConta}
        busca={busca}
        valor={valor}
        ordenar={ordenar}
        filtrosAtivos={filtrosAtivos}
        onChange={navegar}
      />

      {abaAtual === "pendentes" ? (
        <Pendentes
          transacoes={transacoes}
          todasPendentes={todasPendentes}
          contasPorId={contasPorId}
          categorias={categorias}
          moedaCasal={moedaCasal}
          onFiltrarDescricao={(v) => navegar({ aba: "pendentes", busca: v, valor: undefined })}
          onFiltrarValor={(cents) =>
            navegar({
              aba: "pendentes",
              valor: (cents / 100).toFixed(2).replace(".", ","),
              busca: undefined,
            })
          }
        />
      ) : abaAtual === "internas" || ehInterna ? (
        <TransferenciasInternas
          transacoes={categoriaTransacoes}
          links={linksInternos}
          contasPorId={contasPorId}
          moedaCasal={moedaCasal}
        />
      ) : (
        <Categorias
          categoriasResumo={categoriasResumo}
          categoriaAtivaId={categoriaAtivaId}
          categoriaAtiva={categoriaAtiva}
          transacoes={categoriaTransacoes}
          contasPorId={contasPorId}
          categorias={categorias}
          categoriasPorId={categoriasPorId}
          moedaCasal={moedaCasal}
          onSelecionarCategoria={(id) => navegar({ aba: "categorias", categoria: id })}
        />
      )}
    </PageShell>
  );
}

function TabButton({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button type="button" variant={ativo ? "default" : "outline"} size="sm" onClick={onClick}>
      {children}
    </Button>
  );
}

function Filtros({
  membros,
  contas,
  filtroPessoa,
  filtroTipo,
  filtroConta,
  busca,
  valor,
  ordenar,
  filtrosAtivos,
  onChange,
}: {
  membros: Array<{ profile_id: string; profile: Profile }>;
  contas: Account[];
  filtroPessoa: string;
  filtroTipo: string;
  filtroConta: string;
  busca: string;
  valor: string;
  ordenar: string;
  filtrosAtivos: boolean;
  onChange: (next: Record<string, string | undefined>) => void;
}) {
  const [buscaLocal, setBuscaLocal] = useState(busca);
  const [valorLocal, setValorLocal] = useState(valor);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {membros.length > 1 && (
          <Select value={filtroPessoa || "todas"} onValueChange={(v) => onChange({ pessoa: v === "todas" ? undefined : v })}>
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
        <Select value={filtroTipo || "todos"} onValueChange={(v) => onChange({ tipo: v === "todos" ? undefined : v })}>
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
        <Select value={filtroConta || "todas"} onValueChange={(v) => onChange({ conta: v === "todas" ? undefined : v })}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as contas</SelectItem>
            {contas.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}{c.archived ? " (arquivada)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ordenar} onValueChange={(v) => onChange({ ordenar: v })}>
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
        <div className="relative min-w-[180px] flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={buscaLocal}
            onChange={(e) => setBuscaLocal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onChange({ busca: buscaLocal.trim() || undefined, valor: undefined });
            }}
            placeholder="Buscar por descricao..."
            className="pl-8"
          />
        </div>
        <Input
          value={valorLocal}
          onChange={(e) => setValorLocal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onChange({ valor: valorLocal.trim() || undefined, busca: undefined });
          }}
          placeholder="Valor exato"
          inputMode="decimal"
          className="w-[150px]"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ busca: buscaLocal.trim() || undefined, valor: valorLocal.trim() || undefined })}
        >
          Aplicar
        </Button>
        {filtrosAtivos && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setBuscaLocal("");
              setValorLocal("");
              onChange({ pessoa: undefined, tipo: undefined, conta: undefined, busca: undefined, valor: undefined });
            }}
          >
            <X className="size-4" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}

function Categorias({
  categoriasResumo,
  categoriaAtivaId,
  categoriaAtiva,
  transacoes,
  contasPorId,
  categorias,
  categoriasPorId,
  moedaCasal,
  onSelecionarCategoria,
}: {
  categoriasResumo: CategoriaResumo[];
  categoriaAtivaId: string;
  categoriaAtiva: Category | null;
  transacoes: Transaction[];
  contasPorId: Map<string, Account>;
  categorias: Category[];
  categoriasPorId: Map<string, Category>;
  moedaCasal: string;
  onSelecionarCategoria: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[680px] space-y-2 overflow-auto">
          {categoriasResumo.map((c) => (
            <button
              key={c.category_id}
              type="button"
              onClick={() => onSelecionarCategoria(c.category_id)}
              className={
                "w-full rounded-md border p-3 text-left transition hover:bg-muted/60 " +
                (c.category_id === categoriaAtivaId ? "border-primary bg-primary/5" : "")
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {c.icon} {c.nome}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {c.transacoes} lanc. {c.pendentes > 0 ? `| ${c.pendentes} revisar` : ""}
                  </p>
                </div>
                <p className="text-right text-xs font-semibold tabular-nums">
                  {formatMoney(Math.abs(c.saldo_cents), moedaCasal)}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {c.fora_do_resultado && <BadgeTexto>fora do resultado</BadgeTexto>}
                {c.transferencia_interna && <BadgeTexto>duas colunas</BadgeTexto>}
                {c.pendentes > 0 && <BadgeTexto>pendente</BadgeTexto>}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {categoriaAtiva ? `${categoriaAtiva.icon} ${categoriaAtiva.name}` : "Escolha uma categoria"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {transacoes.length === 0 ? (
            <ListEmpty
              icone={<ClipboardCheck className="size-6 text-emerald-600" />}
              titulo="Nada encontrado."
              descricao="Esta categoria nao tem lancamentos com os filtros atuais."
            />
          ) : (
            transacoes.map((t) => (
              <LinhaTransacao
                key={t.id}
                transacao={t}
                conta={contasPorId.get(t.account_id)}
                categoria={t.category_id ? categoriasPorId.get(t.category_id) : undefined}
                categorias={categorias}
                moedaCasal={moedaCasal}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TransferenciasInternas({
  transacoes,
  links,
  contasPorId,
  moedaCasal,
}: {
  transacoes: Transaction[];
  links: InternalTransferLink[];
  contasPorId: Map<string, Account>;
  moedaCasal: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saidaId, setSaidaId] = useState("");
  const [entradaId, setEntradaId] = useState("");

  const linkPorSaida = new Map(links.map((l) => [l.out_transaction_id, l]));
  const linkPorEntrada = new Map(links.map((l) => [l.in_transaction_id, l]));
  const transacoesPorId = new Map(transacoes.map((t) => [t.id, t]));
  const saidas = transacoes.filter((t) => t.type === "despesa");
  const entradas = transacoes.filter((t) => t.type === "receita");
  const selecionadaSaida = transacoesPorId.get(saidaId);
  const selecionadaEntrada = transacoesPorId.get(entradaId);
  const diferenca =
    selecionadaSaida && selecionadaEntrada
      ? selecionadaSaida.amount_primary_cents - selecionadaEntrada.amount_primary_cents
      : 0;

  function linkar() {
    startTransition(async () => {
      const r = await vincularTransferenciaInterna(saidaId, entradaId);
      if (!r.ok) {
        toast.error(r.error ?? "Nao consegui vincular.");
        return;
      }
      toast.success("Transferencia vinculada.");
      setSaidaId("");
      setEntradaId("");
      router.refresh();
    });
  }

  function desvincular(id: string) {
    startTransition(async () => {
      const r = await desvincularTransferenciaInterna(id);
      if (!r.ok) {
        toast.error(r.error ?? "Nao consegui desvincular.");
        return;
      }
      toast.success("Vinculo removido.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div>
            <p className="text-sm font-medium">Conferencia em duas colunas</p>
            <p className="text-muted-foreground text-xs">
              Selecione uma saida e uma entrada para travar o par conferido.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selecionadaSaida && selecionadaEntrada && (
              <span className="text-xs tabular-nums">
                Dif.: {formatMoney(Math.abs(diferenca), moedaCasal)}
              </span>
            )}
            <Button size="sm" onClick={linkar} disabled={!saidaId || !entradaId || pending}>
              <Link2 className="size-4" />
              Vincular
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ColunaTransferencia
          titulo="Saidas"
          icone={<ArrowUpRight className="size-4 text-rose-600" />}
          transacoes={saidas}
          linksPorTransacao={linkPorSaida}
          selecionadaId={saidaId}
          contasPorId={contasPorId}
          moedaCasal={moedaCasal}
          onSelecionar={setSaidaId}
        />
        <ColunaTransferencia
          titulo="Entradas"
          icone={<ArrowDownLeft className="size-4 text-emerald-600" />}
          transacoes={entradas}
          linksPorTransacao={linkPorEntrada}
          selecionadaId={entradaId}
          contasPorId={contasPorId}
          moedaCasal={moedaCasal}
          onSelecionar={setEntradaId}
        />
      </div>

      {links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vinculos feitos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {links.map((l) => {
              const saida = transacoesPorId.get(l.out_transaction_id);
              const entrada = transacoesPorId.get(l.in_transaction_id);
              return (
                <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
                  <p className="min-w-0 flex-1 truncate text-xs">
                    {saida ? resumoCurto(saida.description) : "Saida fora do filtro"} {"->"}{" "}
                    {entrada ? resumoCurto(entrada.description) : "Entrada fora do filtro"}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => desvincular(l.id)} disabled={pending}>
                    <Unlink className="size-4" />
                    Desvincular
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ColunaTransferencia({
  titulo,
  icone,
  transacoes,
  linksPorTransacao,
  selecionadaId,
  contasPorId,
  moedaCasal,
  onSelecionar,
}: {
  titulo: string;
  icone: ReactNode;
  transacoes: Transaction[];
  linksPorTransacao: Map<string, InternalTransferLink>;
  selecionadaId: string;
  contasPorId: Map<string, Account>;
  moedaCasal: string;
  onSelecionar: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icone}
          {titulo} ({transacoes.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="max-h-[720px] space-y-2 overflow-auto">
        {transacoes.map((t) => {
          const link = linksPorTransacao.get(t.id);
          return (
            <button
              key={t.id}
              type="button"
              disabled={Boolean(link)}
              onClick={() => onSelecionar(t.id)}
              className={
                "w-full rounded-md border p-3 text-left transition " +
                (selecionadaId === t.id ? "border-primary bg-primary/5" : "hover:bg-muted/60 ") +
                (link ? "opacity-55" : "")
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{resumoCurto(t.description)}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {dataBR(t.occurred_on)} | {contasPorId.get(t.account_id)?.name ?? ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatMoney(t.amount_primary_cents, moedaCasal)}
                </p>
              </div>
              {link && <p className="text-primary mt-1 text-xs">Vinculada</p>}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function Pendentes({
  transacoes,
  todasPendentes,
  contasPorId,
  categorias,
  moedaCasal,
  onFiltrarDescricao,
  onFiltrarValor,
}: {
  transacoes: Transaction[];
  todasPendentes: Pendente[];
  contasPorId: Map<string, Account>;
  categorias: Category[];
  moedaCasal: string;
  onFiltrarDescricao: (desc: string) => void;
  onFiltrarValor: (cents: number) => void;
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const transacoesSelecionadas = transacoes.filter((t) => selecionados.has(t.id));
  const contagemPorDescricao = new Map<string, number>();
  for (const t of transacoes) {
    const d = (t.description || "").trim().toLowerCase();
    if (d) contagemPorDescricao.set(d, (contagemPorDescricao.get(d) ?? 0) + 1);
  }

  const maisRepetidos = useMemo(() => {
    const porDescricao = new Map<string, number>();
    const porValor = new Map<number, number>();
    for (const t of todasPendentes) {
      const desc = (t.description || "").trim();
      if (desc) porDescricao.set(desc, (porDescricao.get(desc) ?? 0) + 1);
      porValor.set(t.amount_cents, (porValor.get(t.amount_cents) ?? 0) + 1);
    }
    return {
      descricoes: [...porDescricao.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 6),
      valores: [...porValor.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  }, [todasPendentes]);

  function toggle(id: string) {
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
      for (const t of transacoes) if ((t.description || "").trim().toLowerCase() === alvo) next.add(t.id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {(maisRepetidos.descricoes.length > 0 || maisRepetidos.valores.length > 0) && (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.1em]">
            Mais repetidos
          </p>
          <div className="flex flex-wrap gap-1.5">
            {maisRepetidos.descricoes.map(([desc, n]) => (
              <button key={desc} type="button" onClick={() => onFiltrarDescricao(desc)} className="bg-muted hover:bg-muted/70 rounded-full px-2.5 py-1 text-xs">
                {desc} <span className="text-muted-foreground">x{n}</span>
              </button>
            ))}
            {maisRepetidos.valores.map(([cents, n]) => (
              <button key={cents} type="button" onClick={() => onFiltrarValor(cents)} className="bg-muted hover:bg-muted/70 rounded-full px-2.5 py-1 text-xs tabular-nums">
                {formatMoney(cents, moedaCasal)} <span className="text-muted-foreground">x{n}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {transacoes.length > 1 && (
        <button
          type="button"
          onClick={() => setSelecionados(new Set(transacoes.map((t) => t.id)))}
          className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
        >
          Selecionar todos os {transacoes.length} visiveis
        </button>
      )}

      {selecionados.size > 0 && (
        <AplicarEmMassa
          transacoes={transacoesSelecionadas}
          categorias={categorias}
          onLimpar={() => setSelecionados(new Set())}
        />
      )}

      {transacoes.length === 0 ? (
        <ListEmpty
          icone={<ClipboardCheck className="size-6 text-emerald-600" />}
          titulo="Tudo revisado."
          descricao="Sem lancamentos pendentes de categoria no momento."
        />
      ) : (
        <div className="space-y-2">
          {transacoes.map((t) => (
            <LinhaPendente
              key={t.id}
              transacao={t}
              conta={contasPorId.get(t.account_id)}
              categorias={categorias}
              moedaCasal={moedaCasal}
              selecionada={selecionados.has(t.id)}
              onToggle={() => toggle(t.id)}
              iguaisNaLista={contagemPorDescricao.get((t.description || "").trim().toLowerCase()) ?? 0}
              onSelecionarIguais={() => selecionarIguais(t.description || "")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AplicarEmMassa({
  transacoes,
  categorias,
  onLimpar,
}: {
  transacoes: Transaction[];
  categorias: Category[];
  onLimpar: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [categoriaEscolhida, setCategoriaEscolhida] = useState("");
  const tipos = new Set(transacoes.map((t) => t.type));
  const tipoUnico = tipos.size === 1 ? [...tipos][0] : null;
  const opcoes = tipoUnico ? categorias.filter((c) => c.kind === tipoUnico) : [];

  function aplicar() {
    startTransition(async () => {
      const r = await revisarEmMassa(transacoes.map((t) => t.id), categoriaEscolhida);
      if (!r.ok) {
        toast.error(r.error ?? "Nao consegui salvar em lote.");
        return;
      }
      toast.success(`${r.atualizados} lancamentos atualizados.`);
      onLimpar();
      router.refresh();
    });
  }

  if (!tipoUnico) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
          <p className="text-muted-foreground text-xs">
            {transacoes.length} selecionados, mas misturam receita e despesa.
          </p>
          <Button variant="ghost" size="sm" onClick={onLimpar}>
            <X className="size-4" />
            Limpar selecao
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-wrap items-center gap-2 p-3">
        <p className="text-sm font-medium">{transacoes.length} selecionado(s)</p>
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
          Aplicar
        </Button>
        <Button variant="ghost" size="sm" onClick={onLimpar}>
          <X className="size-4" />
          Limpar
        </Button>
      </CardContent>
    </Card>
  );
}

function LinhaPendente({
  transacao,
  conta,
  categorias,
  moedaCasal,
  selecionada,
  onToggle,
  iguaisNaLista,
  onSelecionarIguais,
}: {
  transacao: Transaction;
  conta: Account | undefined;
  categorias: Category[];
  moedaCasal: string;
  selecionada: boolean;
  onToggle: () => void;
  iguaisNaLista: number;
  onSelecionarIguais: () => void;
}) {
  return (
    <LinhaBase
      transacao={transacao}
      conta={conta}
      categorias={categorias}
      moedaCasal={moedaCasal}
      prefixo={
        <input
          type="checkbox"
          checked={selecionada}
          onChange={onToggle}
          className="mt-1 size-4 shrink-0 accent-primary"
          aria-label="Selecionar lancamento"
        />
      }
      rodape={
        iguaisNaLista > 1 ? (
          <button type="button" onClick={onSelecionarIguais} className="text-primary text-xs underline underline-offset-2">
            Selecionar os {iguaisNaLista} com esse nome
          </button>
        ) : null
      }
    />
  );
}

function LinhaTransacao({
  transacao,
  conta,
  categoria,
  categorias,
  moedaCasal,
}: {
  transacao: Transaction;
  conta: Account | undefined;
  categoria: Category | undefined;
  categorias: Category[];
  moedaCasal: string;
}) {
  return (
    <LinhaBase
      transacao={transacao}
      conta={conta}
      categoria={categoria}
      categorias={categorias}
      moedaCasal={moedaCasal}
    />
  );
}

function LinhaBase({
  transacao,
  conta,
  categoria,
  categorias,
  moedaCasal,
  prefixo,
  rodape,
}: {
  transacao: Transaction;
  conta: Account | undefined;
  categoria?: Category;
  categorias: Category[];
  moedaCasal: string;
  prefixo?: ReactNode;
  rodape?: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [categoriaEscolhida, setCategoriaEscolhida] = useState(transacao.category_id ?? "");
  const opcoes = categorias.filter((c) => c.kind === transacao.type);
  const mudou = categoriaEscolhida && categoriaEscolhida !== transacao.category_id;

  function salvar() {
    startTransition(async () => {
      const r = await revisarComCategoria(transacao.id, categoriaEscolhida);
      if (!r.ok) {
        toast.error(r.error ?? "Nao consegui salvar.");
        return;
      }
      toast.success("Categoria atualizada.");
      router.refresh();
    });
  }

  function confirmarAssim() {
    startTransition(async () => {
      const r = await marcarComoRevisada(transacao.id);
      if (!r.ok) {
        toast.error(r.error ?? "Nao consegui confirmar.");
        return;
      }
      toast.success("Confirmado.");
      router.refresh();
    });
  }

  return (
    <Card className={transacao.needs_review ? "border-amber-300/70" : undefined}>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {prefixo}
            <div className="min-w-0">
              <p className="truncate font-medium">{resumoCurto(transacao.description)}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {dataBR(transacao.occurred_on)} | {conta?.name ?? ""}
                {categoria ? ` | ${categoria.name}` : ""}
              </p>
              {rodape}
            </div>
          </div>
          <p className={"shrink-0 text-right text-sm font-semibold tabular-nums " + (transacao.type === "receita" ? "text-emerald-600" : "text-rose-600")}>
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
          ) : transacao.needs_review ? (
            <Button size="sm" variant="outline" onClick={confirmarAssim} disabled={pending}>
              Confirmar
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function BadgeTexto({ children }: { children: ReactNode }) {
  return (
    <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px]">
      {children}
    </span>
  );
}

function categoriaEhTransferencia(categoria: Category) {
  return categoria.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim() === "transferencias internas";
}

function resumoCurto(descricao: string) {
  return descricao.split("[Fonte:")[0]?.trim() || descricao || "Sem descricao";
}
