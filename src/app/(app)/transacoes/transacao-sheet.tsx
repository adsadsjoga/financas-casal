"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoneyInput } from "@/components/app/money-input";
import { formatAmount, formatMoney, parseBRL } from "@/lib/money";
import { calcularShares } from "@/lib/splits";
import { hojeISO } from "@/lib/dates";
import { TIPOS_CONTA } from "@/lib/constants";
import type {
  Account,
  Category,
  Profile,
  Project,
  SplitMode,
  Transaction,
  TxType,
} from "@/lib/database.types";

import { salvarTransacao } from "./actions";

export interface MembroSimples {
  profile_id: string;
  income_cents: number;
  profile: Profile;
}

const MODOS_DIVISAO: { valor: SplitMode; label: string; hint: string }[] = [
  { valor: "none", label: "Não dividir", hint: "A despesa é só de quem pagou." },
  { valor: "equal", label: "Meio a meio", hint: "Cada um fica com metade." },
  {
    valor: "income",
    label: "Pela renda",
    hint: "Quem ganha mais paga proporcionalmente mais.",
  },
];

export function TransacaoSheet({
  aberto,
  onOpenChange,
  transacao,
  contas,
  categorias,
  membros,
  usuarioId,
  moedaCasal,
  projetos,
  projetosDaTransacao,
}: {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  transacao: Transaction | null;
  contas: Account[];
  categorias: Category[];
  membros: MembroSimples[];
  usuarioId: string;
  moedaCasal: string;
  projetos: Project[];
  /** Ids dos projetos já vinculados à transação em edição. */
  projetosDaTransacao: string[];
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();

  const [tipo, setTipo] = useState<TxType>(transacao?.type ?? "despesa");
  const [conta, setConta] = useState(transacao?.account_id ?? contas[0]?.id ?? "");
  const [contaDestino, setContaDestino] = useState(
    transacao?.transfer_account_id ?? "",
  );
  const [categoria, setCategoria] = useState(transacao?.category_id ?? "");
  const [valor, setValor] = useState(
    transacao ? formatAmount(transacao.amount_cents) : "",
  );
  const [descricao, setDescricao] = useState(transacao?.description ?? "");
  const [data, setData] = useState(transacao?.occurred_on ?? hojeISO());
  const [pagador, setPagador] = useState(
    transacao?.payer_profile_id ?? usuarioId,
  );
  const [divisao, setDivisao] = useState<SplitMode>(
    transacao?.split_mode ?? "none",
  );
  const [parcelas, setParcelas] = useState("1");
  const [projetosMarcados, setProjetosMarcados] = useState<string[]>(projetosDaTransacao);

  const editando = Boolean(transacao);
  const contaSelecionada = contas.find((c) => c.id === conta);
  const moedaConta = contaSelecionada?.currency ?? moedaCasal;
  const ehCartao = contaSelecionada?.type === "cartao";
  const ehDespesa = tipo === "despesa";
  const temParceiro = membros.length > 1;

  const categoriasFiltradas = useMemo(
    () =>
      categorias.filter((c) =>
        tipo === "receita" ? c.kind === "receita" : c.kind === "despesa",
      ),
    [categorias, tipo],
  );

  // Prévia da divisão, para ninguém salvar achando que dividiu e não dividiu.
  const previaDivisao = useMemo(() => {
    const cents = parseBRL(valor);
    if (divisao === "none" || cents === null || cents <= 0) return null;
    return calcularShares(cents, divisao, membros);
  }, [valor, divisao, membros]);

  function alternarProjeto(id: string) {
    setProjetosMarcados((atuais) =>
      atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id],
    );
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await salvarTransacao({
        id: transacao?.id,
        type: tipo,
        account_id: conta,
        transfer_account_id: contaDestino,
        category_id: tipo === "transferencia" ? undefined : categoria,
        valor,
        description: descricao,
        occurred_on: data,
        payer_profile_id: pagador,
        split_mode: divisao,
        parcelas: Number(parcelas) || 1,
        project_ids: tipo === "transferencia" ? [] : projetosMarcados,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar.");
        return;
      }
      const n = Number(parcelas) || 1;
      toast.success(
        editando
          ? "Lançamento atualizado."
          : n > 1
            ? `Compra lançada em ${n} parcelas.`
            : "Lançamento salvo.",
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={aberto} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editando ? "Editar lançamento" : "Novo lançamento"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={salvar} className="flex flex-1 flex-col gap-4 p-4">
          <Tabs value={tipo} onValueChange={(v) => setTipo(v as TxType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="despesa">Despesa</TabsTrigger>
              <TabsTrigger value="receita">Receita</TabsTrigger>
              <TabsTrigger value="transferencia">Transferir</TabsTrigger>
            </TabsList>
          </Tabs>

          <MoneyInput
            label={
              moedaConta === moedaCasal ? "Valor" : `Valor (em ${moedaConta})`
            }
            value={valor}
            onChange={setValor}
            required
            currency={moedaConta}
          />

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              placeholder="Mercado, aluguel, salário…"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Input
              id="data"
              type="date"
              required
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{tipo === "transferencia" ? "De" : "Conta"}</Label>
            <Select value={conta} onValueChange={setConta}>
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

          {tipo === "transferencia" && (
            <div className="space-y-2">
              <Label>Para</Label>
              <Select value={contaDestino} onValueChange={setContaDestino}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Conta de destino" />
                </SelectTrigger>
                <SelectContent>
                  {contas
                    .filter((c) => c.id !== conta)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {TIPOS_CONTA[c.type].icon} {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Pagar fatura de cartão é uma transferência — assim o gasto não
                conta duas vezes.
              </p>
            </div>
          )}

          {tipo !== "transferencia" && (
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolher categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasFiltradas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipo !== "transferencia" && projetos.length > 0 && (
            <div className="space-y-2">
              <Label>Projetos</Label>
              <div className="flex flex-wrap gap-1.5">
                {projetos.map((p) => {
                  const marcado = projetosMarcados.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => alternarProjeto(p.id)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        marcado
                          ? "border-primary bg-secondary text-secondary-foreground font-medium"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{p.icon}</span>
                      {p.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-muted-foreground text-xs">
                Junta gastos de categorias diferentes no mesmo esforço — uma
                viagem, uma obra.
              </p>
            </div>
          )}

          {ehCartao && ehDespesa && !editando && (
            <div className="space-y-2">
              <Label htmlFor="parcelas">Parcelas</Label>
              <Input
                id="parcelas"
                inputMode="numeric"
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Acima de 1, cada parcela entra na fatura do seu mês.
              </p>
            </div>
          )}

          {ehDespesa && temParceiro && (
            <>
              <div className="space-y-2">
                <Label>Quem pagou</Label>
                <Select value={pagador} onValueChange={setPagador}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {membros.map((m) => (
                      <SelectItem key={m.profile_id} value={m.profile_id}>
                        {m.profile.avatar_emoji} {m.profile.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Divisão</Label>
                <Select
                  value={divisao}
                  onValueChange={(v) => setDivisao(v as SplitMode)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODOS_DIVISAO.map((m) => (
                      <SelectItem key={m.valor} value={m.valor}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {MODOS_DIVISAO.find((m) => m.valor === divisao)?.hint}
                </p>
              </div>

              {previaDivisao && (
                <div className="bg-muted/50 space-y-1 rounded-md border p-3 text-sm">
                  {previaDivisao.map((s) => {
                    const m = membros.find((x) => x.profile_id === s.profile_id);
                    return (
                      <div key={s.profile_id} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">
                          {m?.profile.display_name ?? "—"}
                        </span>
                        <span className="tabular-nums">
                          {formatMoney(s.share_cents, moedaConta)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <SheetFooter className="mt-auto px-0">
            <Button type="submit" disabled={pendente || !conta}>
              {pendente ? "Salvando…" : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pendente}
            >
              Cancelar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
