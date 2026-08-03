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

import { marcarComoRevisada, revisarComCategoria } from "./actions";

interface Props {
  transacoes: Transaction[];
  contas: Account[];
  categorias: Category[];
  membros: Array<{ profile_id: string; profile: Profile }>;
  filtroPessoa: string;
  busca: string;
  moedaCasal: string;
}

export function RevisarClient({
  transacoes,
  contas,
  categorias,
  membros,
  filtroPessoa,
  busca,
  moedaCasal,
}: Props) {
  const router = useRouter();
  const [buscaLocal, setBuscaLocal] = useState(busca);

  const contasPorId = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);

  function paramsBase() {
    const p = new URLSearchParams();
    if (filtroPessoa) p.set("pessoa", filtroPessoa);
    if (busca) p.set("busca", busca);
    return p;
  }

  function mudarPessoa(pessoa: string) {
    const p = paramsBase();
    if (pessoa) p.set("pessoa", pessoa);
    else p.delete("pessoa");
    router.push(`/revisar?${p.toString()}`);
  }

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const p = paramsBase();
    if (buscaLocal.trim()) p.set("busca", buscaLocal.trim());
    else p.delete("busca");
    router.push(`/revisar?${p.toString()}`);
  }

  const filtrosAtivos = Boolean(filtroPessoa || busca);

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
        <form onSubmit={buscar} className="flex min-w-[200px] flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
            <Input
              value={buscaLocal}
              onChange={(e) => setBuscaLocal(e.target.value)}
              placeholder="Buscar por descrição..."
              className="pl-8"
            />
          </div>
        </form>
        {filtrosAtivos && (
          <Button variant="ghost" size="sm" onClick={() => router.push("/revisar")}>
            <X className="size-4" />
            Limpar
          </Button>
        )}
      </div>

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
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LinhaRevisao({
  transacao,
  conta,
  categorias,
  moedaCasal,
}: {
  transacao: Transaction;
  conta: Account | undefined;
  categorias: Category[];
  moedaCasal: string;
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
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{transacao.description || "Sem descrição"}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {dataBR(transacao.occurred_on)}
              {conta ? ` · ${conta.name}` : ""}
            </p>
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
