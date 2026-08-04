"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, FolderKanban, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListCard, ListRow, ListEmpty } from "@/components/app/list-card";
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
      const r = await salvarProjeto({
        id: editando?.projectId,
        name: nome,
        icon: icone,
      });
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
      <PageShell>
        <PageHeader
          voltar={{ href: "/projetos", rotulo: "Todos os projetos" }}
          titulo={`${projetoAberto.icon} ${projetoAberto.name}`}
          descricao={
            resumo && (
              <>
                {resumo.numTransacoes} lançamento
                {resumo.numTransacoes === 1 ? "" : "s"} · custo de{" "}
                {formatMoney(resumo.custoLiquido, moeda)}
                {resumo.totalRecebido > 0 &&
                  ` (${formatMoney(resumo.totalGasto, moeda)} menos ${formatMoney(resumo.totalRecebido, moeda)} de volta)`}
              </>
            )
          }
        />

        {transacoesDoProjeto.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Nenhum lançamento vinculado ainda. Marque o projeto ao criar ou
            editar uma transação.
          </p>
        ) : (
          <ListCard>
            {transacoesDoProjeto.map((t) => (
              <ListRow key={t.id} className="justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    {t.description || "Sem descrição"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {dataBR(t.occurred_on)}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-medium tabular-nums ${
                    t.type === "receita" ? "text-emerald-600" : ""
                  }`}
                >
                  {t.type === "receita" ? "+" : "−"}
                  {formatMoney(t.amount_primary_cents, moeda)}
                </span>
              </ListRow>
            ))}
          </ListCard>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        titulo="Projetos"
        descricao="Quanto custou cada viagem, obra ou evento — juntando categorias diferentes."
        acao={
          <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
            <DialogTrigger asChild>
              <Button onClick={abrirNovo}>
                <Plus className="size-4" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editando ? "Editar projeto" : "Novo projeto"}
                </DialogTitle>
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
                          icone === i
                            ? "bg-secondary ring-2 ring-ring"
                            : "hover:bg-muted"
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
        }
      />

      {resumos.length === 0 ? (
        <ListEmpty
          icone={<FolderKanban className="size-6" />}
          titulo="Nenhum projeto ainda"
          descricao="Um projeto junta gastos de categorias diferentes que pertencem ao mesmo esforço — o voo, o hotel e os jantares de uma viagem, por exemplo."
          acao={
            <Button onClick={abrirNovo}>
              <Plus className="size-4" />
              Criar projeto
            </Button>
          }
        />
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
    </PageShell>
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
    <ListCard>
      {projetos.map((p) => (
        <ListRow key={p.projectId}>
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
                {p.totalRecebido > 0 &&
                  ` · ${formatMoney(p.totalRecebido, moeda)} de volta`}
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
        </ListRow>
      ))}
    </ListCard>
  );
}
