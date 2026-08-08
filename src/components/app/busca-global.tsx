"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatMoney } from "@/lib/money";
import { dataBR } from "@/lib/dates";

import { buscarTransacoesGlobal, type TransacaoBusca } from "@/app/(app)/transacoes/actions";

/**
 * Busca de lançamento sempre acessível, em qualquer tela — diferente da
 * busca de `/transacoes` (escopada ao período/filtros da página) e das
 * buscas de `/carros`/`/emprestimos` (pensadas só pra vincular). Aqui o
 * resultado leva direto pra edição do lançamento, de qualquer conta ou data.
 */
export function BuscaGlobal({ moeda }: { moeda: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pendente, startTransition] = useTransition();
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<TransacaoBusca[]>([]);
  const [buscou, setBuscou] = useState(false);

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (termo.trim().length < 2) return;
    startTransition(async () => {
      const dados = await buscarTransacoesGlobal(termo);
      setResultados(dados);
      setBuscou(true);
    });
  }

  function abrir(t: TransacaoBusca) {
    setAberto(false);
    router.push(`/transacoes?editar=${t.id}`);
  }

  function fechar(v: boolean) {
    if (!v) {
      setTermo("");
      setResultados([]);
      setBuscou(false);
    }
    setAberto(v);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={() => setAberto(true)}
        aria-label="Buscar lançamento"
      >
        <Search className="size-[1.125rem]" />
      </Button>

      <Dialog open={aberto} onOpenChange={fechar}>
        <DialogContent className="flex max-h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Buscar lançamento</DialogTitle>
          </DialogHeader>

          <form onSubmit={buscar} className="flex items-center gap-2 p-4">
            <Input
              autoFocus
              placeholder="Buscar por descrição…"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
            />
            <Button type="submit" size="icon" variant="outline" disabled={pendente}>
              <Search className="size-4" />
            </Button>
          </form>

          {resultados.length === 0 ? (
            <p className="text-muted-foreground px-4 pb-8 text-center text-sm">
              {pendente
                ? "Buscando…"
                : buscou
                  ? "Nada encontrado."
                  : "Busca em todas as contas e datas do casal."}
            </p>
          ) : (
            <ScrollArea className="flex-1 px-4 pb-4">
              <div className="divide-y">
                {resultados.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => abrir(t)}
                    className="hover:bg-accent flex w-full items-start gap-3 rounded-md px-1 py-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{t.description || "Sem descrição"}</p>
                      <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs">
                        <span>{dataBR(t.occurred_on)}</span>
                        {t.category && (
                          <>
                            <span>·</span>
                            <span>
                              {t.category.icon} {t.category.name}
                            </span>
                          </>
                        )}
                        {t.account && (
                          <>
                            <span>·</span>
                            <span>{t.account.name}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-medium tabular-nums ${
                        t.type === "receita" ? "text-emerald-600" : ""
                      }`}
                    >
                      {t.type === "receita" ? "+" : t.type === "despesa" ? "−" : ""}
                      {formatMoney(t.amount_primary_cents, moeda)}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
