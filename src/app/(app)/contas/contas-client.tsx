"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, CreditCard, EyeOff, MoreVertical, Pencil, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMoney } from "@/lib/money";
import { TIPOS_CONTA } from "@/lib/constants";
import type { Account } from "@/lib/database.types";

import { arquivarConta, reativarConta } from "./actions";
import { ContaSheet, type Membro } from "./conta-sheet";

export function ContasClient({
  contas,
  saldos,
  membros,
  moedaCasal,
}: {
  contas: Account[];
  saldos: Record<string, { nativo: number; principal: number }>;
  membros: Membro[];
  moedaCasal: string;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [sheetAberto, setSheetAberto] = useState(false);
  const [editando, setEditando] = useState<Account | null>(null);
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);

  const ativas = contas.filter((c) => !c.archived);
  const arquivadas = contas.filter((c) => c.archived);
  const visiveis = mostrarArquivadas ? arquivadas : ativas;
  const contasBanco = ativas.filter((c) => c.type === "banco");

  const patrimonio = ativas.reduce(
    (acc, c) => acc + (saldos[c.id]?.principal ?? 0),
    0,
  );

  function abrirNova() {
    setEditando(null);
    setSheetAberto(true);
  }

  function abrirEdicao(conta: Account) {
    setEditando(conta);
    setSheetAberto(true);
  }

  function arquivar(conta: Account) {
    startTransition(async () => {
      const r = await arquivarConta(conta.id);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui arquivar.");
        return;
      }
      toast.success(`${conta.name} arquivada. O histórico continua nos relatórios.`);
      router.refresh();
    });
  }

  function reativar(conta: Account) {
    startTransition(async () => {
      const r = await reativarConta(conta.id);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui reativar.");
        return;
      }
      toast.success(`${conta.name} de volta.`);
      router.refresh();
    });
  }

  function nomeDono(conta: Account) {
    if (!conta.owner_profile_id) return "Conjunta";
    const m = membros.find((x) => x.profile_id === conta.owner_profile_id);
    return m ? m.profile.display_name : "—";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contas</h1>
          <p className="text-muted-foreground text-sm">
            Patrimônio de {formatMoney(patrimonio, moedaCasal)} em {ativas.length}{" "}
            {ativas.length === 1 ? "conta" : "contas"}
          </p>
        </div>
        <Button onClick={abrirNova}>
          <Plus className="size-4" />
          Nova
        </Button>
      </div>

      {arquivadas.length > 0 && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mostrarArquivadas ? "outline" : "secondary"}
            onClick={() => setMostrarArquivadas(false)}
          >
            Ativas ({ativas.length})
          </Button>
          <Button
            size="sm"
            variant={mostrarArquivadas ? "secondary" : "outline"}
            onClick={() => setMostrarArquivadas(true)}
          >
            Arquivadas ({arquivadas.length})
          </Button>
        </div>
      )}

      {visiveis.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">
              {mostrarArquivadas ? "Nada arquivado." : "Nenhuma conta ainda."}
            </p>
            {!mostrarArquivadas && (
              <p className="text-muted-foreground mt-1 text-sm">
                Comece pela conta que vocês mais usam.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visiveis.map((conta) => {
            const saldo = saldos[conta.id]?.nativo ?? 0;
            const info = TIPOS_CONTA[conta.type];
            return (
              <Card key={conta.id} className="relative transition-colors hover:bg-muted/40">
                <CardContent className="flex items-start justify-between gap-3 py-4">
                  <Link
                    href={`/transacoes?conta=${conta.id}`}
                    className="flex min-w-0 flex-1 gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Ver transações da conta ${conta.name}`}
                  >
                    <span
                      className="mt-1 size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: conta.color }}
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium">
                        <span className="mr-1">{info.icon}</span>
                        {conta.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="font-normal">
                          {nomeDono(conta)}
                        </Badge>
                        {conta.currency !== moedaCasal && (
                          <Badge variant="outline" className="font-normal">
                            {conta.currency}
                          </Badge>
                        )}
                        {conta.is_private && (
                          <Badge variant="outline" className="gap-1 font-normal">
                            <EyeOff className="size-3" />
                            privada
                          </Badge>
                        )}
                        {conta.type === "cartao" && conta.closing_day && (
                          <Badge variant="outline" className="font-normal">
                            fecha dia {conta.closing_day}
                          </Badge>
                        )}
                      </div>
                      <p
                        className={`text-lg font-semibold tabular-nums ${
                          saldo < 0 ? "text-rose-600" : ""
                        }`}
                      >
                        {formatMoney(saldo, conta.currency)}
                      </p>
                    </div>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 shrink-0">
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {conta.type === "cartao" && (
                        <DropdownMenuItem asChild>
                          <Link href={`/fatura/${conta.id}`}>
                            <CreditCard className="size-4" />
                            Ver fatura
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => abrirEdicao(conta)}>
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
                      {conta.archived ? (
                        <DropdownMenuItem
                          onSelect={() => reativar(conta)}
                          disabled={pendente}
                        >
                          <RotateCcw className="size-4" />
                          Reativar
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onSelect={() => arquivar(conta)}
                          disabled={pendente}
                        >
                          <Archive className="size-4" />
                          Arquivar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {sheetAberto && (
        <ContaSheet
          aberto={sheetAberto}
          onOpenChange={setSheetAberto}
          conta={editando}
          membros={membros}
          contasBanco={contasBanco}
          moedaCasal={moedaCasal}
        />
      )}
    </div>
  );
}


