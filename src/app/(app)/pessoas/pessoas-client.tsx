"use client";

import { memo, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Archive,
  MoreVertical,
  RotateCcw,
  Search,
  Tag,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListCard, ListEmpty } from "@/components/app/list-card";
import { PessoaSheet } from "@/components/app/pessoa-sheet";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { dataBR } from "@/lib/dates";
import { ROTULO_KIND, type FluxoPessoa, type TransacaoDetalhada } from "@/lib/pessoas";
import type { CounterpartyKind } from "@/lib/database.types";

import {
  adicionarAlias,
  arquivarContraparte,
  buscarTransacoesDaPessoa,
  mudarTipoContraparte,
  removerAlias,
} from "./actions";

/** Debounce leve pra não refiltrar a lista a cada tecla digitada. */
function useDebounced<T>(valor: T, atrasoMs: number): T {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), atrasoMs);
    return () => clearTimeout(id);
  }, [valor, atrasoMs]);
  return debounced;
}

const PERIODOS = [
  { valor: "3m", rotulo: "3 meses" },
  { valor: "6m", rotulo: "6 meses" },
  { valor: "12m", rotulo: "12 meses" },
  { valor: "tudo", rotulo: "Tudo" },
];

type Ordem = "movimento" | "recebido" | "enviado";
/** "todas", um CounterpartyKind, ou "arquivadas". */
type Grupo = "todas" | "arquivadas" | CounterpartyKind;

export function PessoasClient({
  fluxos,
  aliases,
  categorias,
  contas,
  periodo,
  periodoDesde,
  periodoAte,
  moeda,
  totalCadastradas,
}: {
  fluxos: FluxoPessoa[];
  aliases: Array<{ id: string; counterparty_id: string; pattern: string }>;
  categorias: Array<{ id: string; name: string; icon: string }>;
  contas: Array<{ id: string; name: string }>;
  periodo: string;
  periodoDesde: string | null;
  periodoAte: string;
  moeda: string;
  totalCadastradas: number;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounced(busca, 150);
  const [grupo, setGrupo] = useState<Grupo>("todas");
  const [ordem, setOrdem] = useState<Ordem>("movimento");
  const [pessoaAberta, setPessoaAberta] = useState<FluxoPessoa | null>(null);
  const [transacoesDaPessoaAberta, setTransacoesDaPessoaAberta] = useState<TransacaoDetalhada[]>(
    [],
  );
  const [carregandoTransacoes, setCarregandoTransacoes] = useState(false);
  const [editandoTipo, setEditandoTipo] = useState<FluxoPessoa | null>(null);
  const [novoTipo, setNovoTipo] = useState<CounterpartyKind>("pessoa");
  const [editandoApelidos, setEditandoApelidos] = useState<FluxoPessoa | null>(null);
  const [novoApelido, setNovoApelido] = useState("");

  const categoriasPorId = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias],
  );
  const contasPorId = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);

  const abrirPessoa = useCallback(
    (f: FluxoPessoa) => {
      setPessoaAberta(f);
      setTransacoesDaPessoaAberta([]);
      setCarregandoTransacoes(true);
      buscarTransacoesDaPessoa(f.counterpartyId, {
        desde: periodoDesde ?? undefined,
        ate: periodoAte,
      })
        .then((r) => {
          if (!r.ok) {
            toast.error(r.error ?? "Não consegui buscar os lançamentos.");
            return;
          }
          setTransacoesDaPessoaAberta(r.transacoes);
        })
        .finally(() => setCarregandoTransacoes(false));
    },
    [periodoDesde, periodoAte],
  );

  const kindsPresentes = useMemo(() => {
    const vistos = new Set<CounterpartyKind>();
    for (const f of fluxos) if (!f.archived) vistos.add(f.kind);
    return [...vistos].sort((a, b) =>
      ROTULO_KIND[a].localeCompare(ROTULO_KIND[b]),
    );
  }, [fluxos]);

  const numArquivadas = useMemo(() => fluxos.filter((f) => f.archived).length, [fluxos]);

  const lista = useMemo(() => {
    const termo = buscaDebounced.trim().toLowerCase();
    const filtrada = fluxos.filter((f) => {
      if (termo && !f.nome.toLowerCase().includes(termo)) return false;
      if (grupo === "arquivadas") return f.archived;
      if (f.archived) return false; // arquivada só aparece na aba própria
      return grupo === "todas" || f.kind === grupo;
    });

    if (ordem === "recebido") {
      return [...filtrada].sort((a, b) => b.totalRecebido - a.totalRecebido);
    }
    if (ordem === "enviado") {
      return [...filtrada].sort((a, b) => b.totalEnviado - a.totalEnviado);
    }
    return filtrada; // já vem ordenada por movimento total do servidor
  }, [fluxos, buscaDebounced, grupo, ordem]);

  const abrirMudarTipo = useCallback((f: FluxoPessoa) => {
    setNovoTipo(f.kind);
    setEditandoTipo(f);
  }, []);

  function salvarTipo() {
    if (!editandoTipo) return;
    startTransition(async () => {
      const r = await mudarTipoContraparte(editandoTipo.counterpartyId, novoTipo);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui mudar o tipo.");
        return;
      }
      toast.success("Tipo atualizado.");
      setEditandoTipo(null);
      router.refresh();
    });
  }

  const apelidosDaPessoaAberta = useMemo(
    () =>
      editandoApelidos
        ? aliases.filter((a) => a.counterparty_id === editandoApelidos.counterpartyId)
        : [],
    [editandoApelidos, aliases],
  );

  const abrirApelidos = useCallback((f: FluxoPessoa) => {
    setNovoApelido("");
    setEditandoApelidos(f);
  }, []);

  function salvarApelido(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoApelidos || !novoApelido.trim()) return;
    startTransition(async () => {
      const r = await adicionarAlias(editandoApelidos.counterpartyId, novoApelido);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui adicionar.");
        return;
      }
      toast.success("Apelido adicionado — lançamentos futuros com esse trecho já vão casar.");
      setNovoApelido("");
      router.refresh();
    });
  }

  function excluirApelido(aliasId: string) {
    if (!editandoApelidos) return;
    startTransition(async () => {
      const r = await removerAlias(aliasId, editandoApelidos.counterpartyId);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui remover.");
        return;
      }
      router.refresh();
    });
  }

  const alternarArquivo = useCallback(
    (f: FluxoPessoa) => {
      startTransition(async () => {
        const r = await arquivarContraparte(f.counterpartyId, !f.archived);
        if (!r.ok) {
          toast.error(r.error ?? "Não consegui atualizar.");
          return;
        }
        toast.success(f.archived ? `${f.nome} de volta.` : `${f.nome} arquivada.`);
        router.refresh();
      });
    },
    [router, startTransition],
  );

  const totais = useMemo(
    () =>
      lista.reduce(
        (acc, f) => ({
          recebido: acc.recebido + f.totalRecebido,
          enviado: acc.enviado + f.totalEnviado,
        }),
        { recebido: 0, enviado: 0 },
      ),
    [lista],
  );

  return (
    <PageShell>
      <PageHeader
        titulo="Pessoas"
        descricao="Quanto dinheiro foi e veio de cada pessoa ou estabelecimento."
      />

      {totalCadastradas === 0 ? (
        <ListEmpty
          icone={<Users className="size-6" />}
          titulo="Nenhuma pessoa cadastrada ainda"
          descricao="Esta tela agrupa os lançamentos por quem está do outro lado — juntando as várias grafias do mesmo nome que aparecem no extrato. Cadastre as contrapartes para começar."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={periodo}
              onValueChange={(v) => router.push(`/pessoas?periodo=${v}`)}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => (
                  <SelectItem key={p.valor} value={p.valor}>
                    {p.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ordem} onValueChange={(v) => setOrdem(v as Ordem)}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="movimento">Maior movimento</SelectItem>
                <SelectItem value="recebido">Mais recebido</SelectItem>
                <SelectItem value="enviado">Mais enviado</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative min-w-40 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
              <Input
                className="h-8 pl-8"
                placeholder="Buscar pessoa…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-muted flex gap-0.5 overflow-x-auto rounded-lg p-0.5">
            <button
              type="button"
              aria-pressed={grupo === "todas"}
              onClick={() => setGrupo("todas")}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                grupo === "todas"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Todas
            </button>
            {kindsPresentes.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={grupo === k}
                onClick={() => setGrupo(k)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
                  grupo === k
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {ROTULO_KIND[k]}
              </button>
            ))}
            {numArquivadas > 0 && (
              <button
                type="button"
                aria-pressed={grupo === "arquivadas"}
                onClick={() => setGrupo("arquivadas")}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
                  grupo === "arquivadas"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Arquivadas ({numArquivadas})
              </button>
            )}
          </div>

          <Card>
            <CardContent className="grid grid-cols-3 divide-x divide-border py-4 text-center">
              <div>
                <p className="text-muted-foreground text-xs">Recebido</p>
                <p className="mt-1 text-sm font-bold tabular-nums">
                  {formatMoney(totais.recebido, moeda)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Enviado</p>
                <p className="mt-1 text-sm font-bold tabular-nums">
                  {formatMoney(totais.enviado, moeda)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Líquido</p>
                <p className="mt-1 text-sm font-bold tabular-nums">
                  {formatMoney(totais.recebido - totais.enviado, moeda)}
                </p>
              </div>
            </CardContent>
          </Card>

          {lista.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Nenhuma pessoa com movimento nesse período.
            </p>
          ) : (
            <ListCard>
              {lista.map((f) => (
                <LinhaPessoa
                  key={f.counterpartyId}
                  fluxo={f}
                  moeda={moeda}
                  pendente={pendente}
                  onAbrirMudarTipo={abrirMudarTipo}
                  onAbrirApelidos={abrirApelidos}
                  onAlternarArquivo={alternarArquivo}
                  onVerLancamentos={abrirPessoa}
                />
              ))}
            </ListCard>
          )}
        </>
      )}

      <PessoaSheet
        aberto={pessoaAberta !== null}
        onOpenChange={(v) => {
          if (!v) setPessoaAberta(null);
        }}
        nome={pessoaAberta?.nome ?? ""}
        transacoes={transacoesDaPessoaAberta}
        categorias={categoriasPorId}
        contas={contasPorId}
        moeda={moeda}
        modo="somente-leitura"
        carregando={carregandoTransacoes}
      />

      <Dialog open={editandoTipo !== null} onOpenChange={(v) => !v && setEditandoTipo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mudar tipo de {editandoTipo?.nome}</DialogTitle>
          </DialogHeader>
          <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as CounterpartyKind)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROTULO_KIND) as CounterpartyKind[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {ROTULO_KIND[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button onClick={salvarTipo} disabled={pendente}>
              {pendente ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editandoApelidos !== null} onOpenChange={(v) => !v && setEditandoApelidos(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apelidos de {editandoApelidos?.nome}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Todo trecho de texto que o extrato traz pra essa pessoa — se o
            valor não estiver batendo, é porque o extrato trouxe uma grafia
            que nenhum desses cobre. Adicione a nova.
          </p>
          {apelidosDaPessoaAberta.length > 0 && (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {apelidosDaPessoaAberta.map((a) => (
                <div
                  key={a.id}
                  className="bg-muted/50 flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm"
                >
                  <span className="truncate">{a.pattern}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={() => excluirApelido(a.id)}
                    disabled={pendente}
                    aria-label="Remover apelido"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={salvarApelido} className="flex items-center gap-2">
            <Input
              placeholder="Ex.: kelly c dias pereira"
              value={novoApelido}
              onChange={(e) => setNovoApelido(e.target.value)}
            />
            <Button type="submit" disabled={pendente || !novoApelido.trim()}>
              Adicionar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

/**
 * Linha da lista, memoizada — sem isso, cada tecla digitada na busca (ou no
 * dialog de apelidos) recriava a lista inteira e re-renderizava um
 * `DropdownMenu` completo do Radix por pessoa (~200 na base real), travando
 * o input.
 */
const LinhaPessoa = memo(function LinhaPessoa({
  fluxo,
  moeda,
  pendente,
  onAbrirMudarTipo,
  onAbrirApelidos,
  onAlternarArquivo,
  onVerLancamentos,
}: {
  fluxo: FluxoPessoa;
  moeda: string;
  pendente: boolean;
  onAbrirMudarTipo: (f: FluxoPessoa) => void;
  onAbrirApelidos: (f: FluxoPessoa) => void;
  onAlternarArquivo: (f: FluxoPessoa) => void;
  onVerLancamentos: (f: FluxoPessoa) => void;
}) {
  return (
    <div className="space-y-2 px-(--card-spacing) py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{fluxo.nome}</p>
          <p className="text-muted-foreground text-xs">
            {ROTULO_KIND[fluxo.kind]} · {fluxo.numTransacoes} lançamento
            {fluxo.numTransacoes === 1 ? "" : "s"} · {dataBR(fluxo.primeiraTransacao)} a{" "}
            {dataBR(fluxo.ultimaTransacao)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span
            className={`text-sm font-semibold tabular-nums ${
              fluxo.liquido < 0 ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {fluxo.liquido >= 0 ? "+" : "−"}
            {formatMoney(Math.abs(fluxo.liquido), moeda)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <MoreVertical className="size-4" />
                <span className="sr-only">Ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onAbrirMudarTipo(fluxo)}>
                <Tag className="size-4" />
                Mudar tipo
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAbrirApelidos(fluxo)}>
                <UserCog className="size-4" />
                Apelidos/grafias
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAlternarArquivo(fluxo)} disabled={pendente}>
                {fluxo.archived ? (
                  <>
                    <RotateCcw className="size-4" />
                    Reativar
                  </>
                ) : (
                  <>
                    <Archive className="size-4" />
                    Arquivar
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1">
          <ArrowDownLeft className="size-3.5 text-emerald-600" />
          Recebido{" "}
          <span className="text-foreground font-medium tabular-nums">
            {formatMoney(fluxo.totalRecebido, moeda)}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <ArrowUpRight className="size-3.5 text-rose-600" />
          Enviado{" "}
          <span className="text-foreground font-medium tabular-nums">
            {formatMoney(fluxo.totalEnviado, moeda)}
          </span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => onVerLancamentos(fluxo)}
        >
          Ver lançamentos
        </Button>
      </div>
    </div>
  );
});
