"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { TransacaoDetalhada } from "@/lib/pessoas";

/**
 * Todas as transações de uma contraparte, em qualquer conta. Reutilizado em
 * dois lugares:
 * - `/pessoas`, modo "somente-leitura" — substitui o antigo link pra busca
 *   de texto em `/transacoes` por uma lista de verdade da pessoa.
 * - `/carros/[id]`, modo "selecionar" — o comprador de um carro tem um
 *   `buyer_counterparty_id`; abrir aqui e marcar as parcelas certas evita
 *   catar uma por uma no combobox de lançamentos recentes.
 */
export function PessoaSheet({
  aberto,
  onOpenChange,
  nome,
  transacoes,
  categorias,
  contas,
  moeda,
  modo,
  onVincular,
  vinculando,
  carregando,
}: {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  nome: string;
  transacoes: TransacaoDetalhada[];
  categorias: Map<string, { name: string; icon: string }>;
  contas: Map<string, { name: string }>;
  moeda: string;
  modo: "somente-leitura" | "selecionar";
  onVincular?: (transactionIds: string[]) => void;
  vinculando?: boolean;
  carregando?: boolean;
}) {
  const [selecionadas, setSelecionadas] = useState<string[]>([]);

  function alternar(id: string) {
    setSelecionadas((atuais) =>
      atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id],
    );
  }

  function fechar(v: boolean) {
    if (!v) setSelecionadas([]);
    onOpenChange(v);
  }

  return (
    <Sheet open={aberto} onOpenChange={fechar}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{nome}</SheetTitle>
        </SheetHeader>

        {carregando ? (
          <p className="text-muted-foreground px-4 py-10 text-center text-sm">
            Carregando lançamentos…
          </p>
        ) : transacoes.length === 0 ? (
          <p className="text-muted-foreground px-4 py-10 text-center text-sm">
            Nenhuma transação encontrada pra esta pessoa.
          </p>
        ) : (
          <ScrollArea className="flex-1 px-4">
            <div className="divide-y">
              {transacoes.map((t) => {
                const cat = t.category_id ? categorias.get(t.category_id) : null;
                const conta = contas.get(t.account_id)?.name ?? "";
                const marcada = selecionadas.includes(t.id);
                return (
                  <div key={t.id} className="flex items-start gap-3 py-3">
                    {modo === "selecionar" && (
                      <Checkbox
                        className="mt-0.5"
                        checked={marcada}
                        onCheckedChange={() => alternar(t.id)}
                        aria-label={`Selecionar ${t.description || "lançamento"}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {t.description || "Sem descrição"}
                      </p>
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

        {modo === "selecionar" && (
          <SheetFooter className="mt-auto flex-row gap-2 px-4">
            {selecionadas.length > 0 && (
              <Badge variant="secondary" className="mr-auto">
                {selecionadas.length} selecionada
                {selecionadas.length === 1 ? "" : "s"}
              </Badge>
            )}
            <Button
              type="button"
              disabled={selecionadas.length === 0 || vinculando}
              onClick={() => onVincular?.(selecionadas)}
            >
              {vinculando ? "Vinculando…" : "Vincular selecionadas"}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
