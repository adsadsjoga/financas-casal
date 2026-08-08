"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { formatMoney } from "@/lib/money";
import { dataBR } from "@/lib/dates";
import type { Category, Account } from "@/lib/database.types";

import { buscarTransacoesParaVincular, vincularVariasProjeto, type TransacaoBusca } from "./actions";

/**
 * Busca lançamentos do casal por texto e vincula os selecionados ao projeto
 * aberto — mesmo padrão de `PessoaSheet` em modo "selecionar" (usado em
 * `/carros/[id]`), mas aqui a fonte é uma busca livre, não a lista fixa de
 * uma contraparte.
 */
export function VincularTransacoesSheet({
  aberto,
  onOpenChange,
  projectId,
  categorias,
  contas,
  moeda,
  idsVinculados,
  onVinculado,
}: {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  categorias: Category[];
  contas: Account[];
  moeda: string;
  /** Transações já vinculadas a este projeto — aparecem marcadas, não selecionáveis. */
  idsVinculados: string[];
  onVinculado: () => void;
}) {
  const [pendente, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [resultados, setResultados] = useState<TransacaoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [jaBuscou, setJaBuscou] = useState(false);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);

  const mapaCategorias = new Map(categorias.map((c) => [c.id, c]));
  const mapaContas = new Map(contas.map((c) => [c.id, c]));
  const setVinculados = new Set(idsVinculados);

  function alternar(id: string) {
    setSelecionadas((atuais) =>
      atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id],
    );
  }

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!busca.trim() && !de && !ate && !categoriaId) return;
    setBuscando(true);
    setJaBuscou(true);
    startTransition(async () => {
      const dados = await buscarTransacoesParaVincular({
        termo: busca,
        de,
        ate,
        categoriaId,
      });
      setResultados(dados);
      setBuscando(false);
    });
  }

  function vincular() {
    startTransition(async () => {
      const r = await vincularVariasProjeto(selecionadas, projectId);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui vincular.");
        return;
      }
      toast.success(
        `${selecionadas.length} lançamento${selecionadas.length === 1 ? "" : "s"} vinculado${selecionadas.length === 1 ? "" : "s"}.`,
      );
      fechar(false);
      onVinculado();
    });
  }

  function fechar(v: boolean) {
    if (!v) {
      setBusca("");
      setDe("");
      setAte("");
      setCategoriaId("");
      setResultados([]);
      setSelecionadas([]);
      setJaBuscou(false);
    }
    onOpenChange(v);
  }

  return (
    <Sheet open={aberto} onOpenChange={fechar}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Vincular transações existentes</SheetTitle>
        </SheetHeader>

        <form onSubmit={buscar} className="flex flex-col gap-2 px-4">
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              placeholder="Buscar por descrição… (opcional)"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <Button type="submit" size="icon" variant="outline" disabled={buscando}>
              <Search className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="h-9"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              aria-label="De"
            />
            <span className="text-muted-foreground text-xs">até</span>
            <Input
              type="date"
              className="h-9"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              aria-label="Até"
            />
          </div>
          <Select value={categoriaId || "todas"} onValueChange={(v) => setCategoriaId(v === "todas" ? "" : v)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </form>

        {resultados.length === 0 ? (
          <p className="text-muted-foreground px-4 py-10 text-center text-sm">
            {buscando
              ? "Buscando…"
              : jaBuscou
                ? "Nenhum lançamento encontrado com esses filtros."
                : "Filtre por texto, período ou categoria — não precisa preencher tudo."}
          </p>
        ) : (
          <ScrollArea className="mt-2 flex-1 px-4">
            <div className="divide-y">
              {resultados.map((t) => {
                const cat = t.category_id ? mapaCategorias.get(t.category_id) : null;
                const conta = mapaContas.get(t.account_id)?.name ?? "";
                const marcada = selecionadas.includes(t.id);
                const vinculada = setVinculados.has(t.id);
                return (
                  <div key={t.id} className="flex items-start gap-3 py-3">
                    {vinculada ? (
                      <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center" />
                    ) : (
                      <Checkbox
                        className="mt-0.5"
                        checked={marcada}
                        onCheckedChange={() => alternar(t.id)}
                        aria-label={`Selecionar ${t.description || "lançamento"}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{t.description || "Sem descrição"}</p>
                      <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs">
                        <span>{dataBR(t.occurred_on)}</span>
                        {cat && (
                          <>
                            <span>·</span>
                            <span>
                              {cat.icon} {cat.name}
                            </span>
                          </>
                        )}
                        {conta && (
                          <>
                            <span>·</span>
                            <span>{conta}</span>
                          </>
                        )}
                        {vinculada && (
                          <>
                            <span>·</span>
                            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                              Já vinculada
                            </Badge>
                          </>
                        )}
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
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <SheetFooter className="mt-auto flex-row gap-2 px-4">
          {selecionadas.length > 0 && (
            <Badge variant="secondary" className="mr-auto">
              {selecionadas.length} selecionada{selecionadas.length === 1 ? "" : "s"}
            </Badge>
          )}
          <Button type="button" disabled={selecionadas.length === 0 || pendente} onClick={vincular}>
            {pendente ? "Vinculando…" : "Vincular selecionadas"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
