"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ChevronLeft, FolderKanban, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { dataBR } from "@/lib/dates";
import type { ResumoProjeto } from "@/lib/projetos";
import type { Project } from "@/lib/database.types";

import { arquivarProjeto, excluirProjeto, salvarProjeto } from "./actions";

interface TransacaoDoProjeto {
  id: string;
  type: string;
  description: string;
  occurred_on: string;
  amount_primary_cents: number;
}

const ICONES = ["📁", "✈️", "💍", "🏠", "🚗", "🎓", "🎉", "🏖️", "🛠️", "🎁"];

export function ProjetosClient({
  resumos,
  projetoAberto,
  transacoesDoProjeto,
  moeda,
}: {
  resumos: ResumoProjeto[];
  projetoAberto: Project | null;
  transacoesDoProjeto: TransacaoDoProjeto[];
  moeda: string;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<ResumoProjeto | null>(null);
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState("📁");

  const ativos = resumos.filter((p) => !p.archived);
  const arquivados = resumos.filter((p) => p.archived);

  function abrirNovo() {
    setEditando(null);
    setNome("");
    setIcone("📁");
    setDialogAberto(true);
  }

  function abrirEdicao(p: ResumoProjeto) {
    setEditando(p);
    setNome(p.nome);
    setIcone(p.icone);
    setDialogAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await salvarProjeto({ id: editando?.projectId, name: nome, icon: icone });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar.");
        return;
      }
      toast.success(editando ? "Projeto atualizado." : "Projeto criado.");
      setDialogAberto(false);
      router.refresh();
    });
  }

  function alternarArquivo(p: ResumoProjeto) {
    startTransition(async () => {
      const r = await arquivarProjeto(p.projectId, !p.archived);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui atualizar.");
        return;
      }
      router.refresh();
    });
  }

  function excluir(p: ResumoProjeto) {
    startTransition(async () => {
      const r = await excluirProjeto(p.projectId);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui excluir.");
        return;
      }
      toast.success("Projeto excluído. Os lançamentos continuam onde estavam.");
      router.refresh();
    });
  }

  if (projetoAberto) {
    const resumo = resumos.find((r) => r.projectId === projetoAberto.id);
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/projetos")}>
          <ChevronLeft className="size-4" />
          Todos os projetos
        </Button>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {projetoAberto.icon} {projetoAberto.name}
          </h1>
          {resumo && (
            <p className="text-muted-foreground text-sm">
              {resumo.numTransacoes} lançamento{resumo.numTransacoes === 1 ? "" : "s"} ·{" "}
              custo de {formatMoney(resumo.custoLiquido, moeda)}
              {resumo.totalRecebido > 0 &&
                ` (${formatMoney(resumo.totalGasto, moeda)} menos ${formatMoney(resumo.totalRecebido, moeda)} de volta)`}
            </p>
          )}
        </div>

        {transacoesDoProjeto.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Nenhum lançamento vinculado ainda. Marque o projeto ao criar ou
            editar uma transação.
          </p>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border/70 p-0">
              {transacoesDoProjeto.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{t.description || "Sem descrição"}</p>
                    <p className="text-muted-foreground text-xs">{dataBR(t.occurred_on)}</p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-medium tabular-nums ${
                      t.type === "receita" ? "text-emerald-600" : ""
                    }`}
                  >
                    {t.type === "receita" ? "+" : "−"}
                    {formatMoney(t.amount_primary_cents, moeda)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground text-sm">
            Quanto custou cada viagem, obra ou evento — juntando categorias
            diferentes.
          </p>
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
              <DialogTitle>{editando ? "Editar projeto" : "Novo projeto"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={salvar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome-projeto">Nome</Label>
                <Input
                  id="nome-projeto"
                  placeholder="Viagem Cork, Casamento…"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ícone</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ICONES.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIcone(i)}
                      className={`flex size-9 items-center justify-center rounded-md text-lg transition-colors ${
                        icone === i ? "bg-secondary ring-2 ring-ring" : "hover:bg-muted"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pendente}>
                  {pendente ? "Salvando…" : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {resumos.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="bg-secondary text-secondary-foreground flex size-12 items-center justify-center rounded-lg">
              <FolderKanban className="size-6" />
            </span>
            <div>
              <p className="font-medium">Nenhum projeto ainda</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Um projeto junta gastos de categorias diferentes que pertencem
                ao mesmo esforço — o voo, o hotel e os jantares de uma viagem,
                por exemplo.
              </p>
            </div>
            <Button onClick={abrirNovo}>
              <Plus className="size-4" />
              Criar projeto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <ListaProjetos
            projetos={ativos}
            moeda={moeda}
            pendente={pendente}
            onAbrir={(p) => router.push(`/projetos?projeto=${p.projectId}`)}
            onEditar={abrirEdicao}
            onArquivar={alternarArquivo}
            onExcluir={excluir}
          />

          {arquivados.length > 0 && (
            <>
              <p className="text-muted-foreground pt-2 text-xs font-semibold uppercase tracking-wider">
                Arquivados
              </p>
              <ListaProjetos
                projetos={arquivados}
                moeda={moeda}
                pendente={pendente}
                onAbrir={(p) => router.push(`/projetos?projeto=${p.projectId}`)}
                onEditar={abrirEdicao}
                onArquivar={alternarArquivo}
                onExcluir={excluir}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function ListaProjetos({
  projetos,
  moeda,
  pendente,
  onAbrir,
  onEditar,
  onArquivar,
  onExcluir,
}: {
  projetos: ResumoProjeto[];
  moeda: string;
  pendente: boolean;
  onAbrir: (p: ResumoProjeto) => void;
  onEditar: (p: ResumoProjeto) => void;
  onArquivar: (p: ResumoProjeto) => void;
  onExcluir: (p: ResumoProjeto) => void;
}) {
  if (projetos.length === 0) return null;

  return (
    <Card>
      <CardContent className="divide-y divide-border/70 p-0">
        {projetos.map((p) => (
          <div key={p.projectId} className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => onAbrir(p)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
                {p.icone}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.nome}</p>
                <p className="text-muted-foreground text-xs">
                  {p.numTransacoes} lançamento{p.numTransacoes === 1 ? "" : "s"}
                  {p.totalRecebido > 0 && ` · ${formatMoney(p.totalRecebido, moeda)} de volta`}
                </p>
              </div>
            </button>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {formatMoney(p.custoLiquido, moeda)}
            </span>
            <div className="flex shrink-0 gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onEditar(p)}
                disabled={pendente}
                aria-label="Editar"
              >
                <FolderKanban className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onArquivar(p)}
                disabled={pendente}
                aria-label={p.archived ? "Desarquivar" : "Arquivar"}
              >
                {p.archived ? (
                  <ArchiveRestore className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )}
              </Button>
              {p.numTransacoes === 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => onExcluir(p)}
                  disabled={pendente}
                  aria-label="Excluir"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
