"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil, Plus, RotateCcw, Tag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListCard, ListRow, ListEmpty } from "@/components/app/list-card";
import { CORES_CONTA } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Category, CategoryKind } from "@/lib/database.types";

import { arquivarCategoria, salvarCategoria } from "./actions";

const ICONES = [
  "📦", "🛒", "🏠", "🚗", "💊", "🍽️", "🎓", "🎉", "✈️", "💡",
  "📱", "👕", "🐶", "🏋️", "🎬", "💼", "💰", "🎁", "🔧", "📚",
];

export function CategoriasClient({ categorias }: { categorias: Category[] }) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Category | null>(null);
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);

  const [nome, setNome] = useState("");
  const [kind, setKind] = useState<CategoryKind>("despesa");
  const [icone, setIcone] = useState(ICONES[0]);
  const [cor, setCor] = useState(CORES_CONTA[0]);

  const ativas = categorias.filter((c) => !c.archived);
  const arquivadas = categorias.filter((c) => c.archived);
  const visiveis = mostrarArquivadas ? arquivadas : ativas;
  const despesas = visiveis.filter((c) => c.kind === "despesa");
  const receitas = visiveis.filter((c) => c.kind === "receita");

  function abrirNova() {
    setEditando(null);
    setNome("");
    setKind("despesa");
    setIcone(ICONES[0]);
    setCor(CORES_CONTA[0]);
    setDialogAberto(true);
  }

  function abrirEdicao(c: Category) {
    setEditando(c);
    setNome(c.name);
    setKind(c.kind);
    setIcone(c.icon);
    setCor(c.color);
    setDialogAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await salvarCategoria({
        id: editando?.id,
        name: nome,
        kind,
        icon: icone,
        color: cor,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar.");
        return;
      }
      toast.success(editando ? "Categoria atualizada." : "Categoria criada.");
      setDialogAberto(false);
      router.refresh();
    });
  }

  function alternarArquivo(c: Category) {
    startTransition(async () => {
      const r = await arquivarCategoria(c.id, !c.archived);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui atualizar.");
        return;
      }
      toast.success(c.archived ? `${c.name} de volta.` : `${c.name} arquivada.`);
      router.refresh();
    });
  }

  return (
    <PageShell>
      <PageHeader
        titulo="Categorias"
        descricao="Como suas despesas e receitas são organizadas."
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
                <DialogTitle>{editando ? "Editar categoria" : "Nova categoria"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={salvar} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome-categoria">Nome</Label>
                  <Input
                    id="nome-categoria"
                    placeholder="Ginásio, Streaming…"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Tabs value={kind} onValueChange={(v) => setKind(v as CategoryKind)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="despesa">Despesa</TabsTrigger>
                      <TabsTrigger value="receita">Receita</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ICONES.map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setIcone(i)}
                        className={cn(
                          "flex size-9 items-center justify-center rounded-md text-lg transition-colors",
                          icone === i ? "bg-secondary ring-2 ring-ring" : "hover:bg-muted",
                        )}
                      >
                        {i}
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

                <DialogFooter>
                  <Button type="submit" disabled={pendente || !nome.trim()}>
                    {pendente ? "Salvando…" : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
          icone={<Tag className="size-6" />}
          titulo={mostrarArquivadas ? "Nada arquivado." : "Nenhuma categoria ainda."}
        />
      ) : (
        <>
          {despesas.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Despesas
              </p>
              <ListaCategorias
                categorias={despesas}
                pendente={pendente}
                onEditar={abrirEdicao}
                onArquivar={alternarArquivo}
              />
            </div>
          )}
          {receitas.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Receitas
              </p>
              <ListaCategorias
                categorias={receitas}
                pendente={pendente}
                onEditar={abrirEdicao}
                onArquivar={alternarArquivo}
              />
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}

function ListaCategorias({
  categorias,
  pendente,
  onEditar,
  onArquivar,
}: {
  categorias: Category[];
  pendente: boolean;
  onEditar: (c: Category) => void;
  onArquivar: (c: Category) => void;
}) {
  return (
    <ListCard>
      {categorias.map((c) => (
        <ListRow key={c.id}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-lg"
              style={{ backgroundColor: `${c.color}22` }}
            >
              {c.icon}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{c.name}</p>
              {c.archived && (
                <Badge variant="secondary" className="font-normal">
                  arquivada
                </Badge>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onEditar(c)}
              disabled={pendente}
              aria-label="Editar"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onArquivar(c)}
              disabled={pendente}
              aria-label={c.archived ? "Reativar" : "Arquivar"}
            >
              {c.archived ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}
            </Button>
          </div>
        </ListRow>
      ))}
    </ListCard>
  );
}
