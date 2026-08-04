"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyInput } from "@/components/app/money-input";
import { calcularGasto, progressoOrcamento, statusOrcamento } from "@/lib/budgets";
import { formatAmount, formatMoney } from "@/lib/money";
import { addMeses, nomeDoMes } from "@/lib/dates";
import type { Budget, BudgetScope, Category, Profile } from "@/lib/database.types";

import { excluirOrcamento, salvarOrcamento } from "./actions";

interface Membro {
  profile_id: string;
  profile: Profile;
}

interface TransacaoDoMes {
  type: string;
  category_id: string | null;
  payer_profile_id: string | null;
  amount_primary_cents: number;
}

const CORES_STATUS: Record<string, string> = {
  ok: "var(--status-good)",
  perto: "var(--status-warning)",
  estourou: "var(--status-critical)",
};

const CHIP_STATUS: Record<string, { label: string; icone: typeof CheckCircle2 }> = {
  ok: { label: "Em dia", icone: CheckCircle2 },
  perto: { label: "Perto do limite", icone: AlertTriangle },
  estourou: { label: "Estourou", icone: AlertTriangle },
};

/** "casal" ou o profile_id — codifica scope+dono num só valor de <Select>. */
function chaveEscopo(scope: BudgetScope, profileId: string | null): string {
  return scope === "casal" ? "casal" : (profileId ?? "casal");
}

export function OrcamentosClient({
  mes,
  orcamentos,
  categorias,
  transacoesDoMes,
  membros,
  moedaCasal,
}: {
  mes: string;
  orcamentos: Budget[];
  categorias: Category[];
  transacoesDoMes: TransacaoDoMes[];
  membros: Membro[];
  moedaCasal: string;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Budget | null>(null);

  const [categoryId, setCategoryId] = useState("");
  const [escopo, setEscopo] = useState("casal");
  const [limite, setLimite] = useState("");

  const mapaMembros = new Map(membros.map((m) => [m.profile_id, m.profile]));

  const linhas = useMemo(
    () => {
      const mapaCategorias = new Map(categorias.map((c) => [c.id, c]));
      return (
      orcamentos
        .map((o) => {
          const gasto = calcularGasto(transacoesDoMes, {
            category_id: o.category_id,
            scope: o.scope,
            profile_id: o.profile_id,
          });
          return {
            orcamento: o,
            categoria: mapaCategorias.get(o.category_id),
            gasto,
            progresso: progressoOrcamento(gasto, o.limit_cents),
            status: statusOrcamento(gasto, o.limit_cents),
          };
        })
        .sort((a, b) => {
          const ordem = { estourou: 0, perto: 1, ok: 2 };
          return ordem[a.status] - ordem[b.status];
        })
      );
    },
    [orcamentos, transacoesDoMes, categorias],
  );

  function irParaMes(novoMes: string) {
    router.push(`/orcamentos?mes=${novoMes}`);
  }

  function abrirNovo() {
    setEditando(null);
    setCategoryId("");
    setEscopo("casal");
    setLimite("");
    setDialogAberto(true);
  }

  function abrirEdicao(o: Budget) {
    setEditando(o);
    setCategoryId(o.category_id);
    setEscopo(chaveEscopo(o.scope, o.profile_id));
    setLimite(formatAmount(o.limit_cents));
    setDialogAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const scope: BudgetScope = escopo === "casal" ? "casal" : "pessoal";
    startTransition(async () => {
      const r = await salvarOrcamento({
        id: editando?.id,
        category_id: categoryId,
        month: mes,
        scope,
        profile_id: scope === "pessoal" ? escopo : undefined,
        limite,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar.");
        return;
      }
      toast.success("Orçamento salvo.");
      setDialogAberto(false);
      router.refresh();
    });
  }

  function excluir(id: string) {
    startTransition(async () => {
      const r = await excluirOrcamento(id);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui excluir.");
        return;
      }
      toast.success("Orçamento removido.");
      router.refresh();
    });
  }

  function nomeEscopo(o: Budget) {
    if (o.scope === "casal") return "Casal";
    return mapaMembros.get(o.profile_id ?? "")?.display_name ?? "—";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>
          <div className="mt-1 flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => irParaMes(addMeses(mes, -1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-32 text-center text-sm font-medium capitalize">
              {nomeDoMes(mes)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-7"
              onClick={() => irParaMes(addMeses(mes, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger asChild>
            <Button onClick={abrirNovo}>
              <Plus className="size-4" />
              Novo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editando ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={salvar} className="space-y-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolher categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>De quem</Label>
                <Select value={escopo} onValueChange={setEscopo}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casal">💑 Casal (soma os dois)</SelectItem>
                    {membros.map((m) => (
                      <SelectItem key={m.profile_id} value={m.profile_id}>
                        {m.profile.avatar_emoji} Só {m.profile.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <MoneyInput
                label="Limite do mês"
                value={limite}
                onChange={setLimite}
                currency={moedaCasal}
                required
              />

              <DialogFooter className="gap-2 sm:gap-0">
                {editando && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive mr-auto"
                    onClick={() => {
                      excluir(editando.id);
                      setDialogAberto(false);
                    }}
                    disabled={pendente}
                  >
                    <Trash2 className="size-4" />
                    Excluir
                  </Button>
                )}
                <Button type="submit" disabled={pendente || !categoryId}>
                  {pendente ? "Salvando…" : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {linhas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">Nenhum orçamento em {nomeDoMes(mes)}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Defina um limite por categoria para acompanhar o gasto do mês.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {linhas.map(({ orcamento, categoria, gasto, progresso, status }) => (
            <Card
              key={orcamento.id}
              className="cursor-pointer transition-colors hover:bg-muted/40"
              onClick={() => abrirEdicao(orcamento)}
            >
              <CardContent className="space-y-2 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-lg leading-none">{categoria?.icon ?? "📦"}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {categoria?.name ?? "—"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {nomeEscopo(orcamento)}
                      </p>
                    </div>
                  </div>
                  <span
                    className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: CORES_STATUS[status] }}
                  >
                    {(() => {
                      const Icone = CHIP_STATUS[status].icone;
                      return <Icone className="size-3.5" />;
                    })()}
                    {CHIP_STATUS[status].label}
                  </span>
                </div>

                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progresso}%`,
                      backgroundColor: CORES_STATUS[status],
                    }}
                  />
                </div>

                <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
                  <span>{formatMoney(gasto, moedaCasal)}</span>
                  <span>de {formatMoney(orcamento.limit_cents, moedaCasal)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
