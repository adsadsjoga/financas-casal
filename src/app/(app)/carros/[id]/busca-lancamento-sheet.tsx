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

import {
  buscarTransacoesParaVincularCarro,
  vincularLancamento,
  type TransacaoBuscaCarro,
} from "../actions";

const ROLES = [
  ["compra", "Compra"],
  ["custo", "Custo"],
  ["entrada", "Entrada"],
  ["parcela", "Parcela"],
  ["ajuste", "Ajuste"],
] as const;

/**
 * Busca lançamentos do casal por texto (qualquer conta, qualquer tipo,
 * incluindo transferência) pra vincular a este carro — o "Escolher
 * lançamento" ao lado só lista os 80 mais recentes sem busca nenhuma, então
 * um pagamento antigo ou de outra pessoa nunca aparecia lá. Mesmo padrão de
 * `projetos/vincular-transacoes-sheet.tsx`.
 */
export function BuscaLancamentoSheet({
  aberto,
  onOpenChange,
  vehicleId,
  categorias,
  contas,
  moeda,
  onVinculado,
}: {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  vehicleId: string;
  categorias: Map<string, { name: string; icon: string }>;
  contas: Map<string, { name: string }>;
  moeda: string;
  onVinculado: () => void;
}) {
  const [pendente, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<TransacaoBuscaCarro[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [role, setRole] = useState<(typeof ROLES)[number][0]>("custo");

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
      const dados = await buscarTransacoesParaVincularCarro(vehicleId, busca);
      setResultados(dados);
      setBuscando(false);
    });
  }

  function vincular() {
    startTransition(async () => {
      const resultados2 = await Promise.all(
        selecionadas.map((transactionId) => vincularLancamento({ vehicleId, transactionId, role })),
      );
      const falhas = resultados2.filter((r) => !r.ok).length;
      if (falhas > 0) {
        toast.error(
          falhas === resultados2.length
            ? "Não consegui vincular nenhum."
            : `${resultados2.length - falhas} vinculado${resultados2.length - falhas === 1 ? "" : "s"}, ${falhas} falhou.`,
        );
      } else {
        toast.success(
          `${resultados2.length} lançamento${resultados2.length === 1 ? "" : "s"} vinculado${resultados2.length === 1 ? "" : "s"}.`,
        );
      }
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
          <SheetTitle>Buscar lançamento pra vincular</SheetTitle>
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
            {buscando
              ? "Buscando…"
              : "Busca em qualquer conta e qualquer tipo, incluindo transferência."}
          </p>
        ) : (
          <ScrollArea className="mt-2 flex-1 px-4">
            <div className="divide-y">
              {resultados.map((t) => {
                const cat = t.category_id ? categorias.get(t.category_id) : null;
                const conta = contas.get(t.account_id)?.name ?? "";
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
                      {t.type === "receita" ? "+" : t.type === "despesa" ? "−" : ""}
                      {formatMoney(t.amount_primary_cents, moeda)}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <SheetFooter className="mt-auto flex-col gap-2 px-4 sm:flex-col">
          <div className="flex w-full items-center gap-2">
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(([v, label]) => (
                  <SelectItem key={v} value={v}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selecionadas.length > 0 && (
              <Badge variant="secondary" className="shrink-0">
                {selecionadas.length} selecionada{selecionadas.length === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={selecionadas.length === 0 || pendente}
            onClick={vincular}
          >
            {pendente ? "Vinculando…" : "Vincular selecionadas"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
