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
  onVinculado,
}: {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  categorias: Category[];
  contas: Account[];
  moeda: string;
  onVinculado: () => void;
}) {
  const [pendente, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<TransacaoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);

  const mapaCategorias = new Map(categorias.map((c) => [c.id, c]));
  const mapaContas = new Map(contas.map((c) => [c.id, c]));

  function alternar(id: string) {
    setSelecionadas((atuais) =>
      atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id],
    );
  }

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!busca.trim()) return;
    setBuscando(true);
    startTransition(async () => {
      const dados = await buscarTransacoesParaVincular(busca);
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
      setResultados([]);
      setSelecionadas([]);
    }
    onOpenChange(v);
  }

  return (
    <Sheet open={aberto} onOpenChange={fechar}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Vincular transações existentes</SheetTitle>
        </SheetHeader>

        <form onSubmit={buscar} className="flex items-center gap-2 px-4">
          <Input
            autoFocus
            placeholder="Buscar por descrição…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <Button type="submit" size="icon" variant="outline" disabled={buscando}>
            <Search className="size-4" />
          </Button>
        </form>

        {resultados.length === 0 ? (
          <p className="text-muted-foreground px-4 py-10 text-center text-sm">
            {buscando ? "Buscando…" : "Busque pela descrição do lançamento pra vincular."}
          </p>
        ) : (
          <ScrollArea className="mt-2 flex-1 px-4">
            <div className="divide-y">
              {resultados.map((t) => {
                const cat = t.category_id ? mapaCategorias.get(t.category_id) : null;
                const conta = mapaContas.get(t.account_id)?.name ?? "";
                const marcada = selecionadas.includes(t.id);
                return (
                  <div key={t.id} className="flex items-start gap-3 py-3">
                    <Checkbox
                      className="mt-0.5"
                      checked={marcada}
                      onCheckedChange={() => alternar(t.id)}
                      aria-label={`Selecionar ${t.description || "lançamento"}`}
                    />
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
