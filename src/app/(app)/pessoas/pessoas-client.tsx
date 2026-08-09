"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Archive,
  CheckCircle2,
  Edit3,
  LinkIcon,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { SeletorVisao, type OpcaoVisao } from "@/components/app/seletor-visao";
import { ListCard, ListEmpty, ListRow } from "@/components/app/list-card";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { dataBR } from "@/lib/dates";
import { normalizeDescription } from "@/lib/normalize-text";
import { ROTULO_KIND, type FluxoPessoa, type TransacaoDetalhada } from "@/lib/pessoas";
import type { CounterpartyKind } from "@/lib/database.types";

import {
  adicionarAlias,
  arquivarContraparte,
  buscarTransacoesDaPessoa,
  criarContraparte,
  mudarTipoContraparte,
  removerAlias,
  renomearContraparte,
  vincularTransacaoAContraparte,
} from "./actions";

const PERIODOS = [
  { valor: "3m", rotulo: "3 meses" },
  { valor: "6m", rotulo: "6 meses" },
  { valor: "12m", rotulo: "12 meses" },
  { valor: "tudo", rotulo: "Tudo" },
];

const TIPOS_ACERTO = new Set<CounterpartyKind>([
  "pessoa",
  "familiar",
  "amigo",
  "cliente",
  "vendedor",
  "senhorio",
]);

type Ordem = "movimento" | "recebido" | "enviado" | "nome";
type Aba = "pessoas" | "sem-identificacao" | "arquivadas";

function useDebounced<T>(valor: T, atrasoMs: number): T {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), atrasoMs);
    return () => clearTimeout(id);
  }, [valor, atrasoMs]);
  return debounced;
}

function aliasSugerido(descricao: string) {
  return normalizeDescription(descricao).slice(0, 80);
}

export function PessoasClient({
  fluxos,
  contrapartes,
  aliases,
  transacoesSemContraparte,
  categorias,
  contas,
  opcoesVisao,
  visao,
  periodo,
  periodoDesde,
  periodoAte,
  moeda,
  totalCadastradas,
}: {
  fluxos: FluxoPessoa[];
  contrapartes: Array<{
    id: string;
    name: string;
    kind: CounterpartyKind;
    archived: boolean;
  }>;
  aliases: Array<{ id: string; counterparty_id: string; pattern: string }>;
  transacoesSemContraparte: TransacaoDetalhada[];
  categorias: Array<{ id: string; name: string; icon: string }>;
  contas: Array<{ id: string; name: string }>;
  opcoesVisao: OpcaoVisao[];
  visao: string;
  periodo: string;
  periodoDesde: string | null;
  periodoAte: string;
  moeda: string;
  totalCadastradas: number;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [aba, setAba] = useState<Aba>("pessoas");
  const [busca, setBusca] = useState("");
  const buscaDebounced = useDebounced(busca, 150);
  const [tipo, setTipo] = useState<CounterpartyKind | "todos">("todos");
  const [ordem, setOrdem] = useState<Ordem>("movimento");
  const [pessoaAberta, setPessoaAberta] = useState<FluxoPessoa | null>(null);
  const [transacoesDaPessoaAberta, setTransacoesDaPessoaAberta] = useState<TransacaoDetalhada[]>([]);
  const [carregandoTransacoes, setCarregandoTransacoes] = useState(false);
  const [novoAlias, setNovoAlias] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<CounterpartyKind>("pessoa");
  const [dialogNovaPessoa, setDialogNovaPessoa] = useState(false);
  const [dialogTransacao, setDialogTransacao] = useState<TransacaoDetalhada | null>(null);
  const [modoTransacao, setModoTransacao] = useState<"criar" | "vincular">("criar");
  const [transacaoNome, setTransacaoNome] = useState("");
  const [transacaoTipo, setTransacaoTipo] = useState<CounterpartyKind>("pessoa");
  const [transacaoPessoaId, setTransacaoPessoaId] = useState("");
  const [transacaoAlias, setTransacaoAlias] = useState("");

  const categoriasPorId = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias],
  );
  const contasPorId = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);
  const aliasesPorPessoa = useMemo(() => {
    const mapa = new Map<string, Array<{ id: string; pattern: string }>>();
    for (const alias of aliases) {
      const lista = mapa.get(alias.counterparty_id) ?? [];
      lista.push({ id: alias.id, pattern: alias.pattern });
      mapa.set(alias.counterparty_id, lista);
    }
    return mapa;
  }, [aliases]);
  const tiposPresentes = useMemo(() => {
    const set = new Set<CounterpartyKind>();
    for (const f of fluxos) if (!f.archived) set.add(f.kind);
    return [...set].sort((a, b) => ROTULO_KIND[a].localeCompare(ROTULO_KIND[b]));
  }, [fluxos]);

  const pessoasAtivas = useMemo(() => fluxos.filter((f) => !f.archived), [fluxos]);
  const pessoasArquivadas = useMemo(() => fluxos.filter((f) => f.archived), [fluxos]);
  const totais = pessoasAtivas.reduce(
    (acc, f) => ({
      recebido: acc.recebido + f.totalRecebido,
      enviado: acc.enviado + f.totalEnviado,
      comMovimento: acc.comMovimento + (f.numTransacoes > 0 ? 1 : 0),
      usadasNoAcerto: acc.usadasNoAcerto + (TIPOS_ACERTO.has(f.kind) ? 1 : 0),
    }),
    { recebido: 0, enviado: 0, comMovimento: 0, usadasNoAcerto: 0 },
  );

  const lista = useMemo(() => {
    const termo = buscaDebounced.trim().toLowerCase();
    const base = aba === "arquivadas" ? pessoasArquivadas : pessoasAtivas;
    const filtrada = base.filter((f) => {
      if (termo && !f.nome.toLowerCase().includes(termo)) return false;
      if (tipo !== "todos" && f.kind !== tipo) return false;
      return true;
    });

    if (ordem === "recebido") return [...filtrada].sort((a, b) => b.totalRecebido - a.totalRecebido);
    if (ordem === "enviado") return [...filtrada].sort((a, b) => b.totalEnviado - a.totalEnviado);
    if (ordem === "nome") return [...filtrada].sort((a, b) => a.nome.localeCompare(b.nome));
    return [...filtrada].sort(
      (a, b) => b.totalRecebido + b.totalEnviado - (a.totalRecebido + a.totalEnviado),
    );
  }, [aba, pessoasArquivadas, pessoasAtivas, buscaDebounced, tipo, ordem]);

  const semIdentificacaoFiltradas = useMemo(() => {
    const termo = buscaDebounced.trim().toLowerCase();
    if (!termo) return transacoesSemContraparte;
    return transacoesSemContraparte.filter((t) => (t.description || "").toLowerCase().includes(termo));
  }, [buscaDebounced, transacoesSemContraparte]);

  function refreshComToast(mensagem: string) {
    toast.success(mensagem);
    router.refresh();
  }

  function abrirPessoa(f: FluxoPessoa) {
    setPessoaAberta(f);
    setNovoNome(f.nome);
    setNovoTipo(f.kind);
    setNovoAlias("");
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
  }

  function salvarPessoaAberta() {
    if (!pessoaAberta) return;
    startTransition(async () => {
      if (novoNome.trim() !== pessoaAberta.nome) {
        const nomeRes = await renomearContraparte(pessoaAberta.counterpartyId, novoNome);
        if (!nomeRes.ok) {
          toast.error(nomeRes.error ?? "Não consegui renomear.");
          return;
        }
      }
      if (novoTipo !== pessoaAberta.kind) {
        const tipoRes = await mudarTipoContraparte(pessoaAberta.counterpartyId, novoTipo);
        if (!tipoRes.ok) {
          toast.error(tipoRes.error ?? "Não consegui mudar o tipo.");
          return;
        }
      }
      refreshComToast("Pessoa atualizada.");
    });
  }

  function adicionarAliasPessoa(e: React.FormEvent) {
    e.preventDefault();
    if (!pessoaAberta || !novoAlias.trim()) return;
    startTransition(async () => {
      const r = await adicionarAlias(pessoaAberta.counterpartyId, novoAlias);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui adicionar.");
        return;
      }
      setNovoAlias("");
      refreshComToast("Apelido adicionado.");
    });
  }

  function excluirAlias(aliasId: string) {
    if (!pessoaAberta) return;
    startTransition(async () => {
      const r = await removerAlias(aliasId, pessoaAberta.counterpartyId);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui remover.");
        return;
      }
      refreshComToast("Apelido removido.");
    });
  }

  function alternarArquivo(f: FluxoPessoa) {
    startTransition(async () => {
      const r = await arquivarContraparte(f.counterpartyId, !f.archived);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui atualizar.");
        return;
      }
      refreshComToast(f.archived ? "Pessoa reativada." : "Pessoa arquivada.");
    });
  }

  function criarPessoaManual(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await criarContraparte({ name: novoNome, kind: novoTipo, alias: novoAlias });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui criar.");
        return;
      }
      setDialogNovaPessoa(false);
      setNovoNome("");
      setNovoAlias("");
      setNovoTipo("pessoa");
      refreshComToast("Pessoa criada.");
    });
  }

  function abrirTransacao(t: TransacaoDetalhada, modo: "criar" | "vincular") {
    setDialogTransacao(t);
    setModoTransacao(modo);
    setTransacaoNome("");
    setTransacaoTipo("pessoa");
    setTransacaoPessoaId(contrapartes.find((c) => !c.archived)?.id ?? "");
    setTransacaoAlias(aliasSugerido(t.description || ""));
  }

  function salvarTransacao(e: React.FormEvent) {
    e.preventDefault();
    if (!dialogTransacao) return;
    startTransition(async () => {
      const r =
        modoTransacao === "criar"
          ? await criarContraparte({
              name: transacaoNome || dialogTransacao.description || "Nova pessoa",
              kind: transacaoTipo,
              alias: transacaoAlias,
            })
          : await vincularTransacaoAContraparte(
              dialogTransacao.id,
              transacaoPessoaId,
              transacaoAlias,
            );
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar.");
        return;
      }
      setDialogTransacao(null);
      refreshComToast("Identificação salva.");
    });
  }

  return (
    <PageShell largura="painel">
      <PageHeader
        titulo="Pessoas"
        descricao="Identifique quem aparece nos extratos e alimente os pagamentos do acerto."
        acao={
          <Button
            onClick={() => {
              setNovoNome("");
              setNovoAlias("");
              setNovoTipo("pessoa");
              setDialogNovaPessoa(true);
            }}
          >
            <UserPlus className="size-4" />
            Nova pessoa
          </Button>
        }
      />

      {opcoesVisao.length > 0 && (
        <SeletorVisao
          opcoes={opcoesVisao}
          atual={visao}
          basePath="/pessoas"
          parametros={{ periodo }}
        />
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <ResumoCard titulo="Cadastradas" valor={String(totalCadastradas)} detalhe={`${totais.comMovimento} com movimento`} />
        <ResumoCard titulo="Sem identificação" valor={String(transacoesSemContraparte.length)} detalhe="revisar aliases" alerta={transacoesSemContraparte.length > 0} />
        <ResumoCard titulo="Recebido" valor={formatMoney(totais.recebido, moeda)} detalhe="pessoas ativas" />
        <ResumoCard titulo="Enviado" valor={formatMoney(totais.enviado, moeda)} detalhe={`${totais.usadasNoAcerto} contam no acerto`} />
      </div>

      <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="pessoas">Pessoas</TabsTrigger>
          <TabsTrigger value="sem-identificacao">
            Sem identificação
            {transacoesSemContraparte.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {transacoesSemContraparte.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="arquivadas">Arquivadas</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodo} onValueChange={(v) => router.push(`/pessoas?periodo=${v}&visao=${visao}`)}>
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

          {aba !== "sem-identificacao" && (
            <>
              <Select value={tipo} onValueChange={(v) => setTipo(v as CounterpartyKind | "todos")}>
                <SelectTrigger className="h-8 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {tiposPresentes.map((k) => (
                    <SelectItem key={k} value={k}>
                      {ROTULO_KIND[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ordem} onValueChange={(v) => setOrdem(v as Ordem)}>
                <SelectTrigger className="h-8 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movimento">Maior movimento</SelectItem>
                  <SelectItem value="recebido">Mais recebido</SelectItem>
                  <SelectItem value="enviado">Mais enviado</SelectItem>
                  <SelectItem value="nome">Nome</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          <div className="relative min-w-48 flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
            <Input
              className="h-8 pl-8"
              placeholder={aba === "sem-identificacao" ? "Buscar lançamento..." : "Buscar pessoa..."}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="pessoas" className="space-y-3">
          <ListaPessoas
            lista={lista}
            aliasesPorPessoa={aliasesPorPessoa}
            moeda={moeda}
            pendente={pendente}
            onAbrir={abrirPessoa}
            onArquivar={alternarArquivo}
          />
        </TabsContent>

        <TabsContent value="sem-identificacao" className="space-y-3">
          {semIdentificacaoFiltradas.length === 0 ? (
            <ListEmpty
              icone={<CheckCircle2 className="size-6" />}
              titulo="Tudo identificado nesse período"
              descricao="Quando um recebimento não aparecer no acerto, procure aqui e crie um alias."
            />
          ) : (
            <ListCard className="max-h-[36rem] overflow-y-auto">
              {semIdentificacaoFiltradas.map((t) => (
                <TransacaoSemIdentificacao
                  key={t.id}
                  transacao={t}
                  moeda={moeda}
                  categorias={categoriasPorId}
                  contas={contasPorId}
                  onCriar={() => abrirTransacao(t, "criar")}
                  onVincular={() => abrirTransacao(t, "vincular")}
                />
              ))}
            </ListCard>
          )}
        </TabsContent>

        <TabsContent value="arquivadas" className="space-y-3">
          <ListaPessoas
            lista={lista}
            aliasesPorPessoa={aliasesPorPessoa}
            moeda={moeda}
            pendente={pendente}
            onAbrir={abrirPessoa}
            onArquivar={alternarArquivo}
          />
        </TabsContent>
      </Tabs>

      <Sheet open={pessoaAberta !== null} onOpenChange={(v) => !v && setPessoaAberta(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{pessoaAberta?.nome ?? "Pessoa"}</SheetTitle>
          </SheetHeader>
          {pessoaAberta && (
            <div className="space-y-5 px-4 pb-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as CounterpartyKind)}>
                    <SelectTrigger>
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
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={TIPOS_ACERTO.has(novoTipo) ? "default" : "secondary"}>
                  {TIPOS_ACERTO.has(novoTipo) ? "Conta no acerto" : "Fora do acerto"}
                </Badge>
                <Badge variant="outline">
                  {pessoaAberta.numTransacoes} lançamento{pessoaAberta.numTransacoes === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button onClick={salvarPessoaAberta} disabled={pendente}>
                  <Edit3 className="size-4" />
                  Salvar
                </Button>
                <Button variant="outline" onClick={() => alternarArquivo(pessoaAberta)} disabled={pendente}>
                  {pessoaAberta.archived ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}
                  {pessoaAberta.archived ? "Reativar" : "Arquivar"}
                </Button>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Apelidos e grafias</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(aliasesPorPessoa.get(pessoaAberta.counterpartyId) ?? []).map((alias) => (
                    <Badge key={alias.id} variant="secondary" className="gap-1">
                      {alias.pattern}
                      <button
                        type="button"
                        onClick={() => excluirAlias(alias.id)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Remover apelido"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <form onSubmit={adicionarAliasPessoa} className="flex gap-2">
                  <Input
                    placeholder="Trecho que aparece no extrato"
                    value={novoAlias}
                    onChange={(e) => setNovoAlias(e.target.value)}
                  />
                  <Button type="submit" disabled={pendente || !novoAlias.trim()}>
                    <Plus className="size-4" />
                    Alias
                  </Button>
                </form>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Lançamentos reconhecidos</h3>
                {carregandoTransacoes ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">Carregando lançamentos...</p>
                ) : transacoesDaPessoaAberta.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">Nenhum lançamento nesse período.</p>
                ) : (
                  <div className="divide-border/70 max-h-80 divide-y overflow-y-auto rounded-md border">
                    {transacoesDaPessoaAberta.map((t) => (
                      <LinhaTransacao
                        key={t.id}
                        transacao={t}
                        moeda={moeda}
                        categorias={categoriasPorId}
                        contas={contasPorId}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={dialogNovaPessoa} onOpenChange={setDialogNovaPessoa}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova pessoa</DialogTitle>
          </DialogHeader>
          <form onSubmit={criarPessoaManual} className="space-y-4">
            <CampoPessoa nome={novoNome} setNome={setNovoNome} tipo={novoTipo} setTipo={setNovoTipo} alias={novoAlias} setAlias={setNovoAlias} />
            <DialogFooter>
              <Button type="submit" disabled={pendente || !novoNome.trim()}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogTransacao !== null} onOpenChange={(v) => !v && setDialogTransacao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modoTransacao === "criar" ? "Criar pessoa para lançamento" : "Vincular lançamento"}
            </DialogTitle>
          </DialogHeader>
          {dialogTransacao && (
            <form onSubmit={salvarTransacao} className="space-y-4">
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">{dialogTransacao.description || "Sem descrição"}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {dataBR(dialogTransacao.occurred_on)} · {formatMoney(dialogTransacao.amount_primary_cents, moeda)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                <Button
                  type="button"
                  variant={modoTransacao === "criar" ? "secondary" : "ghost"}
                  onClick={() => setModoTransacao("criar")}
                >
                  Criar pessoa
                </Button>
                <Button
                  type="button"
                  variant={modoTransacao === "vincular" ? "secondary" : "ghost"}
                  onClick={() => setModoTransacao("vincular")}
                >
                  Vincular existente
                </Button>
              </div>

              {modoTransacao === "criar" ? (
                <CampoPessoa
                  nome={transacaoNome}
                  setNome={setTransacaoNome}
                  tipo={transacaoTipo}
                  setTipo={setTransacaoTipo}
                  alias={transacaoAlias}
                  setAlias={setTransacaoAlias}
                />
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Pessoa</Label>
                    <Select value={transacaoPessoaId} onValueChange={setTransacaoPessoaId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {contrapartes
                          .filter((c) => !c.archived)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Alias que identifica</Label>
                    <Input value={transacaoAlias} onChange={(e) => setTransacaoAlias(e.target.value)} />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="submit" disabled={pendente || !transacaoAlias.trim()}>
                  Salvar identificação
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function ResumoCard({ titulo, valor, detalhe, alerta }: { titulo: string; valor: string; detalhe: string; alerta?: boolean }) {
  return (
    <Card className={cn(alerta && "border-amber-500/40")}>
      <CardContent className="py-4">
        <p className="text-muted-foreground text-xs">{titulo}</p>
        <p className="mt-1 text-lg font-bold tabular-nums">{valor}</p>
        <p className="text-muted-foreground mt-1 text-xs">{detalhe}</p>
      </CardContent>
    </Card>
  );
}

function ListaPessoas({
  lista,
  aliasesPorPessoa,
  moeda,
  pendente,
  onAbrir,
  onArquivar,
}: {
  lista: FluxoPessoa[];
  aliasesPorPessoa: Map<string, Array<{ id: string; pattern: string }>>;
  moeda: string;
  pendente: boolean;
  onAbrir: (f: FluxoPessoa) => void;
  onArquivar: (f: FluxoPessoa) => void;
}) {
  if (lista.length === 0) {
    return (
      <ListEmpty
        icone={<Users className="size-6" />}
        titulo="Nenhuma pessoa nessa visão"
        descricao="Ajuste filtros ou crie uma nova pessoa."
      />
    );
  }
  return (
    <ListCard>
      {lista.map((f) => (
        <ListRow key={f.counterpartyId} className="items-start justify-between gap-3">
          <button type="button" onClick={() => onAbrir(f)} className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold">{f.nome}</p>
              <Badge variant={TIPOS_ACERTO.has(f.kind) ? "default" : "secondary"}>
                {ROTULO_KIND[f.kind]}
              </Badge>
              {f.numTransacoes === 0 && <Badge variant="outline">sem movimento</Badge>}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {f.numTransacoes > 0
                ? `${f.numTransacoes} lançamento${f.numTransacoes === 1 ? "" : "s"} · ${dataBR(f.primeiraTransacao)} a ${dataBR(f.ultimaTransacao)}`
                : "Cadastrada, pronta para receber aliases"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {(aliasesPorPessoa.get(f.counterpartyId) ?? []).slice(0, 3).map((alias) => (
                <Badge key={alias.id} variant="outline" className="max-w-40 truncate">
                  {alias.pattern}
                </Badge>
              ))}
            </div>
          </button>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className={cn("text-sm font-semibold tabular-nums", f.liquido < 0 ? "text-rose-600" : "text-emerald-600")}>
              {f.liquido >= 0 ? "+" : "-"}
              {formatMoney(Math.abs(f.liquido), moeda)}
            </span>
            <div className="text-muted-foreground flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs">
              <span className="flex items-center gap-1">
                <ArrowDownLeft className="size-3.5 text-emerald-600" />
                {formatMoney(f.totalRecebido, moeda)}
              </span>
              <span className="flex items-center gap-1">
                <ArrowUpRight className="size-3.5 text-rose-600" />
                {formatMoney(f.totalEnviado, moeda)}
              </span>
            </div>
            <div className="flex gap-1">
              <Button type="button" variant="outline" size="sm" onClick={() => onAbrir(f)}>
                Abrir
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => onArquivar(f)} disabled={pendente}>
                {f.archived ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}
              </Button>
            </div>
          </div>
        </ListRow>
      ))}
    </ListCard>
  );
}

function TransacaoSemIdentificacao({
  transacao,
  moeda,
  categorias,
  contas,
  onCriar,
  onVincular,
}: {
  transacao: TransacaoDetalhada;
  moeda: string;
  categorias: Map<string, { name: string; icon: string }>;
  contas: Map<string, { name: string }>;
  onCriar: () => void;
  onVincular: () => void;
}) {
  return (
    <ListRow className="items-start justify-between">
      <LinhaTransacao transacao={transacao} moeda={moeda} categorias={categorias} contas={contas} />
      <div className="flex shrink-0 gap-1">
        <Button type="button" size="sm" onClick={onCriar}>
          <UserPlus className="size-4" />
          Criar
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onVincular}>
          <LinkIcon className="size-4" />
          Vincular
        </Button>
      </div>
    </ListRow>
  );
}

function LinhaTransacao({
  transacao,
  moeda,
  categorias,
  contas,
}: {
  transacao: TransacaoDetalhada;
  moeda: string;
  categorias: Map<string, { name: string; icon: string }>;
  contas: Map<string, { name: string }>;
}) {
  const categoria = transacao.category_id ? categorias.get(transacao.category_id) : null;
  const conta = contas.get(transacao.account_id)?.name;
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium">{transacao.description || "Sem descrição"}</p>
      <p className="text-muted-foreground mt-1 flex flex-wrap gap-x-1.5 text-xs">
        <span>{dataBR(transacao.occurred_on)}</span>
        {categoria && <span>· {categoria.icon} {categoria.name}</span>}
        {conta && <span>· {conta}</span>}
      </p>
      <p className={cn("mt-1 text-sm font-semibold tabular-nums", transacao.type === "receita" ? "text-emerald-600" : "text-rose-600")}>
        {transacao.type === "receita" ? "+" : "-"}
        {formatMoney(transacao.amount_primary_cents, moeda)}
      </p>
    </div>
  );
}

function CampoPessoa({
  nome,
  setNome,
  tipo,
  setTipo,
  alias,
  setAlias,
}: {
  nome: string;
  setNome: (v: string) => void;
  tipo: CounterpartyKind;
  setTipo: (v: CounterpartyKind) => void;
  alias: string;
  setAlias: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Kelly Pereira" />
      </div>
      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select value={tipo} onValueChange={(v) => setTipo(v as CounterpartyKind)}>
          <SelectTrigger>
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
      </div>
      <div className="space-y-1.5">
        <Label>Alias inicial</Label>
        <Input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Trecho que aparece no extrato" />
      </div>
    </div>
  );
}
