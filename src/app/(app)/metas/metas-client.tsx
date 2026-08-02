"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Check,
  ChevronDown,
  MoreVertical,
  Pencil,
  PiggyBank,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
  agruparPorContribuinte,
  diasAteOPrazo,
  progressoMeta,
  totalAportado,
} from "@/lib/goals";
import { formatAmount, formatMoney } from "@/lib/money";
import { dataBR, hojeISO } from "@/lib/dates";
import { CORES_CONTA } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Goal, GoalContribution, Profile } from "@/lib/database.types";

import {
  alternarConcluida,
  arquivarMeta,
  registrarAporte,
  salvarMeta,
} from "./actions";

interface Membro {
  profile_id: string;
  profile: Profile;
}

const EMOJIS_META = ["🎯", "✈️", "🏠", "🚗", "💍", "🎓", "👶", "🏖️", "💰", "🛡️"];

export function MetasClient({
  metas,
  aportes,
  membros,
  usuarioId,
  moedaCasal,
}: {
  metas: Goal[];
  aportes: GoalContribution[];
  membros: Membro[];
  usuarioId: string;
  moedaCasal: string;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();

  const [dialogMetaAberto, setDialogMetaAberto] = useState(false);
  const [editando, setEditando] = useState<Goal | null>(null);
  const [nome, setNome] = useState("");
  const [alvo, setAlvo] = useState("");
  const [prazo, setPrazo] = useState("");
  const [icone, setIcone] = useState(EMOJIS_META[0]);
  const [cor, setCor] = useState(CORES_CONTA[0]);

  const [metaAportando, setMetaAportando] = useState<Goal | null>(null);
  const [pessoaAporte, setPessoaAporte] = useState(usuarioId);
  const [valorAporte, setValorAporte] = useState("");

  const [expandida, setExpandida] = useState<string | null>(null);

  const mapaMembros = new Map(membros.map((m) => [m.profile_id, m.profile]));
  const aportesPorMeta = useMemo(() => {
    const mapa = new Map<string, GoalContribution[]>();
    for (const a of aportes) {
      if (!mapa.has(a.goal_id)) mapa.set(a.goal_id, []);
      mapa.get(a.goal_id)!.push(a);
    }
    return mapa;
  }, [aportes]);

  function abrirNovaMeta() {
    setEditando(null);
    setNome("");
    setAlvo("");
    setPrazo("");
    setIcone(EMOJIS_META[0]);
    setCor(CORES_CONTA[0]);
    setDialogMetaAberto(true);
  }

  function abrirEdicaoMeta(m: Goal) {
    setEditando(m);
    setNome(m.name);
    setAlvo(formatAmount(m.target_cents));
    setPrazo(m.deadline ?? "");
    setIcone(m.icon);
    setCor(m.color);
    setDialogMetaAberto(true);
  }

  function salvarMetaForm(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await salvarMeta({
        id: editando?.id,
        name: nome,
        target: alvo,
        deadline: prazo,
        icon: icone,
        color: cor,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar.");
        return;
      }
      toast.success("Meta salva.");
      setDialogMetaAberto(false);
      router.refresh();
    });
  }

  function abrirAporte(m: Goal) {
    setMetaAportando(m);
    setPessoaAporte(usuarioId);
    setValorAporte("");
  }

  function confirmarAporte(e: React.FormEvent) {
    e.preventDefault();
    if (!metaAportando) return;
    startTransition(async () => {
      const r = await registrarAporte({
        goal_id: metaAportando.id,
        profile_id: pessoaAporte,
        valor: valorAporte,
        occurred_on: hojeISO(),
      });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui registrar.");
        return;
      }
      toast.success("Aporte registrado.");
      setMetaAportando(null);
      router.refresh();
    });
  }

  function arquivar(m: Goal) {
    startTransition(async () => {
      const r = await arquivarMeta(m.id);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui arquivar.");
        return;
      }
      toast.success(`${m.name} arquivada.`);
      router.refresh();
    });
  }

  function concluir(m: Goal, valor: boolean) {
    startTransition(async () => {
      const r = await alternarConcluida(m.id, valor);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui atualizar.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Metas</h1>
          <p className="text-muted-foreground text-sm">Objetivos e aportes do casal</p>
        </div>

        <Dialog open={dialogMetaAberto} onOpenChange={setDialogMetaAberto}>
          <DialogTrigger asChild>
            <Button onClick={abrirNovaMeta}>
              <Plus className="size-4" />
              Nova
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editando ? "Editar meta" : "Nova meta"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={salvarMetaForm} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome-meta">Nome</Label>
                <Input
                  id="nome-meta"
                  required
                  placeholder="Viagem, entrada da casa…"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <MoneyInput
                label="Valor da meta"
                value={alvo}
                onChange={setAlvo}
                currency={moedaCasal}
                required
              />

              <div className="space-y-2">
                <Label htmlFor="prazo-meta">Prazo (opcional)</Label>
                <Input
                  id="prazo-meta"
                  type="date"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Ícone</Label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJIS_META.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setIcone(e)}
                      className={cn(
                        "rounded-md border px-2 py-1 text-lg transition-colors",
                        icone === e ? "border-foreground bg-muted" : "border-transparent",
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {CORES_CONTA.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Cor ${c}`}
                      onClick={() => setCor(c)}
                      className={cn(
                        "size-7 rounded-full border-2 transition-transform",
                        cor === c ? "border-foreground scale-110" : "border-transparent",
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                {editando && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive mr-auto"
                    onClick={() => {
                      arquivar(editando);
                      setDialogMetaAberto(false);
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
      </div>

      {metas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <PiggyBank className="text-muted-foreground size-8" />
            <div>
              <p className="font-medium">Nenhuma meta ainda</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Viagem, reserva de emergência, entrada de casa — o que vocês
                estiverem guardando para.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {metas.map((meta) => {
            const aportesDaMeta = aportesPorMeta.get(meta.id) ?? [];
            const total = totalAportado(aportesDaMeta);
            const progresso = progressoMeta(aportesDaMeta, meta.target_cents);
            const dias = diasAteOPrazo(meta.deadline, hojeISO());
            const porPessoa = agruparPorContribuinte(aportesDaMeta);
            const aberta = expandida === meta.id;

            return (
              <Card key={meta.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-lg"
                        style={{ backgroundColor: meta.color + "26" }}
                      >
                        {meta.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{meta.name}</p>
                          {meta.completed && (
                            <Badge variant="secondary" className="gap-1 font-normal">
                              <Check className="size-3" />
                              concluída
                            </Badge>
                          )}
                        </div>
                        {meta.deadline && (
                          <p className="text-muted-foreground text-xs">
                            {dias !== null && dias >= 0
                              ? `${dias} dia${dias === 1 ? "" : "s"} até ${dataBR(meta.deadline)}`
                              : `Prazo era ${dataBR(meta.deadline)}`}
                          </p>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 shrink-0">
                          <MoreVertical className="size-4" />
                          <span className="sr-only">Ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => abrirEdicaoMeta(meta)}>
                          <Pencil className="size-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => concluir(meta, !meta.completed)}
                          disabled={pendente}
                        >
                          <Check className="size-4" />
                          {meta.completed ? "Reabrir" : "Marcar concluída"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => arquivar(meta)} disabled={pendente}>
                          <Archive className="size-4" />
                          Arquivar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${progresso}%`, backgroundColor: meta.color }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium tabular-nums">
                      {formatMoney(total, moedaCasal)}
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        de {formatMoney(meta.target_cents, moedaCasal)}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {progresso}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setExpandida(aberta ? null : meta.id)}
                      className="text-muted-foreground flex items-center gap-1 text-xs hover:underline"
                      disabled={porPessoa.length === 0}
                    >
                      {porPessoa.length > 0 && (
                        <>
                          <ChevronDown
                            className={cn("size-3.5 transition-transform", aberta && "rotate-180")}
                          />
                          quem contribuiu
                        </>
                      )}
                    </button>
                    <Dialog
                      open={metaAportando?.id === meta.id}
                      onOpenChange={(v) => !v && setMetaAportando(null)}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => abrirAporte(meta)}>
                          <Plus className="size-3.5" />
                          Aportar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Aportar em {meta.name}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={confirmarAporte} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Quem</Label>
                            <Select value={pessoaAporte} onValueChange={setPessoaAporte}>
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
                          <MoneyInput
                            label="Valor"
                            value={valorAporte}
                            onChange={setValorAporte}
                            currency={moedaCasal}
                            required
                          />
                          <DialogFooter>
                            <Button type="submit" disabled={pendente}>
                              {pendente ? "Salvando…" : "Confirmar"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {aberta && porPessoa.length > 0 && (
                    <div className="space-y-1 border-t pt-2">
                      {porPessoa.map((p) => (
                        <div key={p.profile_id} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {mapaMembros.get(p.profile_id)?.avatar_emoji}{" "}
                            {mapaMembros.get(p.profile_id)?.display_name ?? "—"}
                          </span>
                          <span className="tabular-nums">{formatMoney(p.total, moedaCasal)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
