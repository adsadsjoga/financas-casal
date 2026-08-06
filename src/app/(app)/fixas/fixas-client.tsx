"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Calendar,
  Check,
  MoreVertical,
  Pencil,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListCard, ListRow, ListEmpty } from "@/components/app/list-card";
import { SeletorVisao, type OpcaoVisao } from "@/components/app/seletor-visao";
import { ContraparteCombobox } from "@/components/app/contraparte-combobox";
import { GraficoDespesasPorCategoria } from "@/components/app/dashboard-charts";
import { GraficoPrevisaoSaldo } from "@/components/app/fixas-charts";
import type { FatiaCategoria } from "@/lib/dashboard";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  calcularPrevisaoSaldo,
  construirExtratoPrevisao,
  cruzarComLancamentos,
  diaEfetivoDoMes,
} from "@/lib/fixas";
import { formatAmount, formatMoney } from "@/lib/money";
import { dataBR, nomeDoMes } from "@/lib/dates";
import { TIPOS_CONTA } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type {
  Account,
  Category,
  Recurrence,
  RecurrenceKind,
  SplitMode,
  TxType,
} from "@/lib/database.types";

import {
  arquivarRecorrencia,
  lancarRecorrencia,
  salvarRecorrencia,
} from "./actions";

interface Membro {
  profile_id: string;
  profile: { display_name: string; avatar_emoji: string };
}

export function FixasClient({
  recorrencias,
  idsLancadosEsteMes,
  patrimonioAtual,
  contas,
  categorias,
  mesAtual,
  hoje,
  moedaCasal,
  opcoesVisao,
  visao,
  custoFixoPorCategoria,
  mesesAnalise,
  membros,
  contrapartes,
}: {
  recorrencias: Recurrence[];
  idsLancadosEsteMes: string[];
  patrimonioAtual: number;
  contas: Account[];
  categorias: Category[];
  mesAtual: string;
  hoje: string;
  moedaCasal: string;
  opcoesVisao: OpcaoVisao[];
  visao: string;
  custoFixoPorCategoria: FatiaCategoria[];
  mesesAnalise: number;
  membros: Membro[];
  contrapartes: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();

  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Recurrence | null>(null);
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<TxType>("despesa");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState("5");
  const [contaId, setContaId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [kind, setKind] = useState<RecurrenceKind>("fixa");
  const [dividir, setDividir] = useState<SplitMode>("none");
  const [customSplit, setCustomSplit] = useState<Record<string, string>>({});
  const [pagoA, setPagoA] = useState("");
  const [counterpartyId, setCounterpartyId] = useState<string | null>(null);
  const contrapartesPorId = useMemo(
    () => new Map(contrapartes.map((c) => [c.id, c])),
    [contrapartes],
  );

  function percentPadrao(): Record<string, string> {
    if (membros.length === 0) return {};
    const cada = String(Math.floor(100 / membros.length));
    return Object.fromEntries(membros.map((m) => [m.profile_id, cada]));
  }

  const [lancando, setLancando] = useState<Recurrence | null>(null);
  const [contaLancamento, setContaLancamento] = useState("");
  const [valorLancamento, setValorLancamento] = useState("");
  const [dataLancamento, setDataLancamento] = useState("");

  const idsLancadosSet = useMemo(
    () => new Set(idsLancadosEsteMes),
    [idsLancadosEsteMes],
  );

  const status = useMemo(
    () => cruzarComLancamentos(recorrencias, idsLancadosSet, mesAtual, hoje),
    [recorrencias, idsLancadosSet, mesAtual, hoje],
  );

  const previsao = useMemo(
    () => calcularPrevisaoSaldo(patrimonioAtual, status, hoje),
    [patrimonioAtual, status, hoje],
  );

  const extrato = useMemo(
    () => construirExtratoPrevisao(status, patrimonioAtual, hoje),
    [status, patrimonioAtual, hoje],
  );

  const atrasadas = status.filter((s) => s.atrasada);
  const aVencer = status.filter((s) => !s.lancada && !s.atrasada);
  const jaLancadas = status.filter((s) => s.lancada);

  const mapaContas = new Map(contas.map((c) => [c.id, c]));
  const mapaCategorias = new Map(categorias.map((c) => [c.id, c]));

  function abrirNova() {
    setEditando(null);
    setDescricao("");
    setTipo("despesa");
    setValor("");
    setDia("5");
    setContaId("");
    setCategoryId("");
    setKind("fixa");
    setDividir("none");
    setCustomSplit(percentPadrao());
    setPagoA("");
    setCounterpartyId(null);
    setDialogAberto(true);
  }

  function abrirEdicao(r: Recurrence) {
    setEditando(r);
    setDescricao(r.description);
    setTipo(r.type);
    setValor(formatAmount(r.amount_cents));
    setDia(String(r.day_of_month));
    setContaId(r.account_id ?? "");
    setCategoryId(r.category_id ?? "");
    setKind(r.kind);
    setDividir(r.split_mode);
    setCustomSplit(
      r.custom_split
        ? Object.fromEntries(Object.entries(r.custom_split).map(([id, pct]) => [id, String(pct)]))
        : percentPadrao(),
    );
    setPagoA(r.counterparty_id ? (contrapartesPorId.get(r.counterparty_id)?.name ?? "") : "");
    setCounterpartyId(r.counterparty_id);
    setDialogAberto(true);
  }

  const somaCustomSplit = Object.values(customSplit).reduce(
    (acc, v) => acc + (Number(v) || 0),
    0,
  );

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (dividir === "custom" && somaCustomSplit !== 100) {
      toast.error("Os percentuais precisam somar 100%.");
      return;
    }
    startTransition(async () => {
      const r = await salvarRecorrencia({
        id: editando?.id,
        description: descricao,
        amount: valor,
        type: tipo,
        account_id: contaId,
        category_id: categoryId,
        counterparty_id: counterpartyId,
        day_of_month: dia,
        kind,
        split_mode: dividir,
        custom_split:
          dividir === "custom"
            ? Object.fromEntries(
                Object.entries(customSplit).map(([id, v]) => [id, Number(v) || 0]),
              )
            : undefined,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar.");
        return;
      }
      toast.success("Conta fixa salva.");
      setDialogAberto(false);
      router.refresh();
    });
  }

  function arquivar(r: Recurrence) {
    startTransition(async () => {
      const res = await arquivarRecorrencia(r.id);
      if (!res.ok) {
        toast.error(res.error ?? "Não consegui arquivar.");
        return;
      }
      toast.success(`${r.description} arquivada.`);
      router.refresh();
    });
  }

  function abrirLancamento(r: Recurrence) {
    setLancando(r);
    setContaLancamento(r.account_id ?? contas[0]?.id ?? "");
    setValorLancamento(formatAmount(r.amount_cents));
    setDataLancamento(diaEfetivoDoMes(mesAtual, r.day_of_month));
  }

  function confirmarLancamento(e: React.FormEvent) {
    e.preventDefault();
    if (!lancando) return;
    startTransition(async () => {
      const r = await lancarRecorrencia({
        recurrence_id: lancando.id,
        account_id: contaLancamento,
        category_id: lancando.category_id ?? undefined,
        type: lancando.type,
        amount: valorLancamento,
        description: lancando.description,
        occurred_on: dataLancamento,
        split_mode: lancando.split_mode,
        custom_split: lancando.custom_split,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui lançar.");
        return;
      }
      toast.success("Lançado.");
      setLancando(null);
      router.refresh();
    });
  }

  return (
    <PageShell>
      <PageHeader
        titulo="Contas fixas"
        descricao={<span className="capitalize">{nomeDoMes(mesAtual)}</span>}
        acao={
          <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
            <DialogTrigger asChild>
              <Button onClick={abrirNova}>
                <Plus className="size-4" />
                Nova
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editando ? "Editar conta fixa" : "Nova conta fixa"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={salvar} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="desc-fixa">Nome</Label>
                  <Input
                    id="desc-fixa"
                    required
                    placeholder="Aluguel, luz, streaming, salário…"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={tipo}
                      onValueChange={(v) => setTipo(v as TxType)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="despesa">Despesa</SelectItem>
                        <SelectItem value="receita">Receita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dia-fixa">Dia do mês</Label>
                    <Input
                      id="dia-fixa"
                      inputMode="numeric"
                      required
                      value={dia}
                      onChange={(e) => setDia(e.target.value)}
                    />
                  </div>
                </div>

                <MoneyInput
                  label="Valor"
                  value={valor}
                  onChange={setValor}
                  currency={moedaCasal}
                  required
                />

                <div className="space-y-2">
                  <Label>Conta (opcional)</Label>
                  <Select value={contaId} onValueChange={setContaId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolher na hora de lançar" />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {TIPOS_CONTA[c.type].icon} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Categoria (opcional)</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sem categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias
                        .filter((c) => c.kind === tipo)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.icon} {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Pago a (opcional)</Label>
                  <ContraparteCombobox
                    contrapartes={contrapartes}
                    texto={pagoA}
                    onTextoChange={setPagoA}
                    onSelecionar={setCounterpartyId}
                    placeholder="Senhorio, empresa de luz…"
                  />
                  <p className="text-muted-foreground text-xs">
                    Escolher uma sugestão liga a conta fixa ao cadastro dessa
                    pessoa/empresa em Pessoas.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Valor muda todo mês?</Label>
                  <Select
                    value={kind}
                    onValueChange={(v) => setKind(v as RecurrenceKind)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixa">
                        Não, é sempre o mesmo valor
                      </SelectItem>
                      <SelectItem value="variavel">
                        Sim, varia (luz, água…)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {kind === "variavel" && (
                    <p className="text-muted-foreground text-xs">
                      Você ajusta o valor exato na hora de lançar cada mês.
                    </p>
                  )}
                </div>

                {tipo === "despesa" && membros.length > 1 && (
                  <div className="space-y-2">
                    <Label>Divisão</Label>
                    <Select
                      value={dividir}
                      onValueChange={(v) => setDividir(v as SplitMode)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não dividir</SelectItem>
                        <SelectItem value="equal">Meio a meio</SelectItem>
                        <SelectItem value="income">Pela renda</SelectItem>
                        <SelectItem value="custom">
                          Percentual fixo (ex.: Vodafone 70/30)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {dividir === "custom" && (
                      <div className="space-y-2 rounded-md border p-3">
                        {membros.map((m) => (
                          <div key={m.profile_id} className="flex items-center justify-between gap-3">
                            <Label htmlFor={`pct-${m.profile_id}`} className="text-sm font-normal">
                              {m.profile.avatar_emoji} {m.profile.display_name}
                            </Label>
                            <div className="flex items-center gap-1">
                              <Input
                                id={`pct-${m.profile_id}`}
                                inputMode="numeric"
                                className="h-8 w-16 text-right"
                                value={customSplit[m.profile_id] ?? ""}
                                onChange={(e) =>
                                  setCustomSplit((atual) => ({
                                    ...atual,
                                    [m.profile_id]: e.target.value,
                                  }))
                                }
                              />
                              <span className="text-muted-foreground text-sm">%</span>
                            </div>
                          </div>
                        ))}
                        <p
                          className={cn(
                            "text-xs",
                            somaCustomSplit === 100 ? "text-muted-foreground" : "text-[var(--status-critical)]",
                          )}
                        >
                          Soma: {somaCustomSplit}% {somaCustomSplit !== 100 && "— precisa dar 100%"}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                  {editando && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive mr-auto"
                      onClick={() => {
                        arquivar(editando);
                        setDialogAberto(false);
                      }}
                      disabled={pendente}
                    >
                      <Archive className="size-4" />
                      Arquivar
                    </Button>
                  )}
                  <Button type="submit" disabled={pendente}>
                    {pendente ? "Salvando…" : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {opcoesVisao.length > 0 && <SeletorVisao opcoes={opcoesVisao} atual={visao} basePath="/fixas" />}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Previsão até o fim do mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums",
              previsao < 0 && "text-[var(--status-critical)]",
            )}
          >
            {formatMoney(previsao, moedaCasal)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Patrimônio de hoje + o que ainda falta entrar e sair das contas
            fixas
          </p>
        </CardContent>
      </Card>

      {extrato.atrasadasForaDaPrevisao.length > 0 && (
        <div className="border-amber-500/30 bg-amber-500/10 rounded-lg border px-3 py-2 text-xs">
          <p className="font-medium">
            {extrato.atrasadasForaDaPrevisao.length} conta
            {extrato.atrasadasForaDaPrevisao.length === 1 ? "" : "s"} atrasada
            {extrato.atrasadasForaDaPrevisao.length === 1 ? "" : "s"}, fora da
            previsão acima
          </p>
          <p className="text-muted-foreground mt-0.5">
            {extrato.atrasadasForaDaPrevisao.map((s) => s.recorrencia.description).join(", ")} — já venceu e ainda
            não foi lançada, então não entra no número da previsão até você lançar.
          </p>
        </div>
      )}

      {extrato.itens.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Extrato da previsão</CardTitle>
            <p className="text-muted-foreground text-xs">
              Como o número acima se forma, vencimento por vencimento
            </p>
          </CardHeader>
          <CardContent className="divide-border/70 divide-y p-0">
            {extrato.itens.map((item) => (
              <ListRow key={item.recorrencia.id} className="px-(--card-spacing)">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.recorrencia.description}</p>
                  <p className="text-muted-foreground text-xs">vence {dataBR(item.vencimento)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "text-sm font-medium tabular-nums",
                      item.delta < 0 ? "text-rose-600" : "text-emerald-600",
                    )}
                  >
                    {item.delta >= 0 ? "+" : "−"}
                    {formatMoney(Math.abs(item.delta), moedaCasal)}
                  </p>
                  <p className="text-muted-foreground text-[11px] tabular-nums">
                    saldo {formatMoney(item.saldoProjetadoApos, moedaCasal)}
                  </p>
                </div>
              </ListRow>
            ))}
          </CardContent>
        </Card>
      )}

      {extrato.itens.length > 1 && (
        <GraficoPrevisaoSaldo itens={extrato.itens} moeda={moedaCasal} />
      )}

      {custoFixoPorCategoria.length > 0 && (
        <GraficoDespesasPorCategoria dados={custoFixoPorCategoria} moeda={moedaCasal} />
      )}
      {custoFixoPorCategoria.length > 0 && (
        <p className="text-muted-foreground -mt-3 text-center text-xs">
          Só o que já foi lançado a partir de uma conta fixa, nos últimos{" "}
          {mesesAnalise} meses.
        </p>
      )}

      {recorrencias.filter((r) => r.active).length === 0 ? (
        <ListEmpty
          icone={<Calendar className="size-6" />}
          titulo="Nenhuma conta fixa ainda"
          descricao="Aluguel, luz, streaming, salário — cadastre uma vez e acompanhe todo mês."
        />
      ) : (
        <div className="space-y-5">
          {atrasadas.length > 0 && (
            <GrupoRecorrencias
              titulo="Atrasadas"
              corTitulo="text-[var(--status-critical)]"
              itens={atrasadas}
              mapaContas={mapaContas}
              mapaCategorias={mapaCategorias}
              mapaContrapartes={contrapartesPorId}
              moedaCasal={moedaCasal}
              onLancar={abrirLancamento}
              onEditar={abrirEdicao}
              onArquivar={arquivar}
              pendente={pendente}
            />
          )}
          {aVencer.length > 0 && (
            <GrupoRecorrencias
              titulo="A vencer"
              itens={aVencer}
              mapaContas={mapaContas}
              mapaCategorias={mapaCategorias}
              mapaContrapartes={contrapartesPorId}
              moedaCasal={moedaCasal}
              onLancar={abrirLancamento}
              onEditar={abrirEdicao}
              onArquivar={arquivar}
              pendente={pendente}
            />
          )}
          {jaLancadas.length > 0 && (
            <GrupoRecorrencias
              titulo="Já lançadas este mês"
              itens={jaLancadas}
              mapaContas={mapaContas}
              mapaCategorias={mapaCategorias}
              mapaContrapartes={contrapartesPorId}
              moedaCasal={moedaCasal}
              onLancar={abrirLancamento}
              onEditar={abrirEdicao}
              onArquivar={arquivar}
              pendente={pendente}
              apagado
            />
          )}
        </div>
      )}

      <Dialog open={!!lancando} onOpenChange={(v) => !v && setLancando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançar {lancando?.description}</DialogTitle>
          </DialogHeader>
          {lancando && (
            <form onSubmit={confirmarLancamento} className="space-y-4">
              {lancando.counterparty_id && (
                <p className="text-muted-foreground text-xs">
                  Pago a{" "}
                  <span className="text-foreground font-medium">
                    {contrapartesPorId.get(lancando.counterparty_id)?.name}
                  </span>
                  .
                </p>
              )}
              <MoneyInput
                label="Valor"
                value={valorLancamento}
                onChange={setValorLancamento}
                currency={
                  mapaContas.get(contaLancamento)?.currency ?? moedaCasal
                }
                required
              />
              <div className="space-y-2">
                <Label>Conta</Label>
                <Select
                  value={contaLancamento}
                  onValueChange={setContaLancamento}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolher conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {TIPOS_CONTA[c.type].icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="data-lancamento">Data</Label>
                <Input
                  id="data-lancamento"
                  type="date"
                  required
                  value={dataLancamento}
                  onChange={(e) => setDataLancamento(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pendente || !contaLancamento}>
                  {pendente ? "Lançando…" : "Confirmar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function GrupoRecorrencias({
  titulo,
  corTitulo,
  itens,
  mapaContas,
  mapaCategorias,
  mapaContrapartes,
  moedaCasal,
  onLancar,
  onEditar,
  onArquivar,
  pendente,
  apagado,
}: {
  titulo: string;
  corTitulo?: string;
  itens: ReturnType<typeof cruzarComLancamentos<Recurrence>>;
  mapaContas: Map<string, Account>;
  mapaCategorias: Map<string, Category>;
  mapaContrapartes: Map<string, { id: string; name: string }>;
  moedaCasal: string;
  onLancar: (r: Recurrence) => void;
  onEditar: (r: Recurrence) => void;
  onArquivar: (r: Recurrence) => void;
  pendente: boolean;
  apagado?: boolean;
}) {
  return (
    <div className="space-y-2">
      <h2
        className={cn(
          "text-sm font-medium",
          corTitulo ?? "text-muted-foreground",
        )}
      >
        {titulo}
      </h2>
      <ListCard>
        {itens.map(({ recorrencia: r, lancada }) => {
          const conta = r.account_id ? mapaContas.get(r.account_id) : null;
          const categoria = r.category_id
            ? mapaCategorias.get(r.category_id)
            : null;
          const contraparte = r.counterparty_id
            ? mapaContrapartes.get(r.counterparty_id)
            : null;
          const moeda = conta?.currency ?? moedaCasal;

          return (
            <ListRow key={r.id} className={cn(apagado && "opacity-60")}>
              {r.type === "receita" ? (
                <TrendingUp className="text-emerald-600 size-4 shrink-0" />
              ) : (
                <TrendingDown className="text-rose-600 size-4 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {r.description}
                  </p>
                  {r.kind === "variavel" && (
                    <Badge variant="outline" className="shrink-0 font-normal">
                      variável
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Calendar className="size-3" />
                  dia {r.day_of_month}
                  {categoria && ` · ${categoria.icon} ${categoria.name}`}
                  {conta && ` · ${conta.name}`}
                  {contraparte && ` · pago a ${contraparte.name}`}
                </p>
              </div>
              <span className="text-sm font-medium tabular-nums">
                {formatMoney(r.amount_cents, moeda)}
              </span>
              {lancada ? (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Check className="size-3.5" />
                </span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => onLancar(r)}>
                  Lançar
                </Button>
              )}
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
                  <DropdownMenuItem onSelect={() => onEditar(r)}>
                    <Pencil className="size-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => onArquivar(r)}
                    disabled={pendente}
                  >
                    <Archive className="size-4" />
                    Arquivar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ListRow>
          );
        })}
      </ListCard>
    </div>
  );
}
