"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  CreditCard,
  EyeOff,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListCard, ListRow, ListEmpty } from "@/components/app/list-card";
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
  usuarioId,
}: {
  contas: Account[];
  saldos: Record<string, { nativo: number; principal: number }>;
  membros: Membro[];
  moedaCasal: string;
  /** Dono logado — decide quais contas entram em "Suas contas" primeiro. */
  usuarioId: string;
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

  // Relevância dentro de cada grupo = maior saldo (em módulo) primeiro —
  // conta zerada ou pouco movimentada não compete por atenção com a que
  // concentra o dinheiro.
  function porRelevancia(a: Account, b: Account): number {
    const sa = Math.abs(saldos[a.id]?.principal ?? 0);
    const sb = Math.abs(saldos[b.id]?.principal ?? 0);
    return sb - sa;
  }

  const minhas = visiveis.filter((c) => c.owner_profile_id === usuarioId).sort(porRelevancia);
  const conjuntas = visiveis.filter((c) => c.owner_profile_id === null).sort(porRelevancia);
  const doParceiro = visiveis
    .filter((c) => c.owner_profile_id !== null && c.owner_profile_id !== usuarioId)
    .sort(porRelevancia);
  const nomeParceiro =
    membros.find((m) => m.profile_id !== usuarioId)?.profile.display_name ?? "Parceiro";

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
      toast.success(
        `${conta.name} arquivada. O histórico continua nos relatórios.`,
      );
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
    <PageShell>
      <PageHeader
        titulo="Contas"
        descricao={`Patrimônio de ${formatMoney(patrimonio, moedaCasal)} em ${ativas.length} ${
          ativas.length === 1 ? "conta" : "contas"
        }`}
        acao={
          <Button onClick={abrirNova}>
            <Plus className="size-4" />
            Nova
          </Button>
        }
      />

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
        <ListEmpty
          icone={<Wallet className="size-6" />}
          titulo={
            mostrarArquivadas ? "Nada arquivado." : "Nenhuma conta ainda."
          }
          descricao={
            !mostrarArquivadas && "Comece pela conta que vocês mais usam."
          }
        />
      ) : (
        <>
          <SecaoContas
            titulo="Suas contas"
            contas={minhas}
            saldos={saldos}
            moedaCasal={moedaCasal}
            nomeDono={nomeDono}
            pendente={pendente}
            onEditar={abrirEdicao}
            onArquivar={arquivar}
            onReativar={reativar}
          />
          <SecaoContas
            titulo="Conjuntas"
            contas={conjuntas}
            saldos={saldos}
            moedaCasal={moedaCasal}
            nomeDono={nomeDono}
            pendente={pendente}
            onEditar={abrirEdicao}
            onArquivar={arquivar}
            onReativar={reativar}
          />
          <SecaoContas
            titulo={`Contas de ${nomeParceiro.split(" ")[0]}`}
            contas={doParceiro}
            saldos={saldos}
            moedaCasal={moedaCasal}
            nomeDono={nomeDono}
            pendente={pendente}
            onEditar={abrirEdicao}
            onArquivar={arquivar}
            onReativar={reativar}
          />
        </>
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
    </PageShell>
  );
}

function SecaoContas({
  titulo,
  contas,
  saldos,
  moedaCasal,
  nomeDono,
  pendente,
  onEditar,
  onArquivar,
  onReativar,
}: {
  titulo: string;
  contas: Account[];
  saldos: Record<string, { nativo: number; principal: number }>;
  moedaCasal: string;
  nomeDono: (conta: Account) => string;
  pendente: boolean;
  onEditar: (conta: Account) => void;
  onArquivar: (conta: Account) => void;
  onReativar: (conta: Account) => void;
}) {
  if (contas.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
        {titulo}
      </p>
      <ListCard>
        {contas.map((conta) => (
          <LinhaConta
            key={conta.id}
            conta={conta}
            saldo={saldos[conta.id]?.nativo ?? 0}
            moedaCasal={moedaCasal}
            dono={nomeDono(conta)}
            pendente={pendente}
            onEditar={onEditar}
            onArquivar={onArquivar}
            onReativar={onReativar}
          />
        ))}
      </ListCard>
    </div>
  );
}

function LinhaConta({
  conta,
  saldo,
  moedaCasal,
  dono,
  pendente,
  onEditar,
  onArquivar,
  onReativar,
}: {
  conta: Account;
  saldo: number;
  moedaCasal: string;
  dono: string;
  pendente: boolean;
  onEditar: (conta: Account) => void;
  onArquivar: (conta: Account) => void;
  onReativar: (conta: Account) => void;
}) {
  const info = TIPOS_CONTA[conta.type];
  return (
    <ListRow className="items-start justify-between">
      <Link
        href={`/transacoes?conta=${conta.id}`}
        className="focus-visible:ring-ring flex min-w-0 flex-1 gap-3 rounded-md focus-visible:ring-2 focus-visible:outline-none"
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
              {dono}
            </Badge>
            {conta.currency !== moedaCasal && (
              <Badge variant="outline" className="font-normal">
                {conta.currency}
              </Badge>
            )}
            {conta.is_private && (
              <Badge variant="secondary" className="gap-1 font-normal">
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
          <DropdownMenuItem onSelect={() => onEditar(conta)}>
            <Pencil className="size-4" />
            Editar
          </DropdownMenuItem>
          {conta.archived ? (
            <DropdownMenuItem onSelect={() => onReativar(conta)} disabled={pendente}>
              <RotateCcw className="size-4" />
              Reativar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => onArquivar(conta)} disabled={pendente}>
              <Archive className="size-4" />
              Arquivar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </ListRow>
  );
}
