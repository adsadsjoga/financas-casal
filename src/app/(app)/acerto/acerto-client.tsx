"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListRow } from "@/components/app/list-card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/components/app/money-input";
import { formatAmount, formatMoney, parseBRL } from "@/lib/money";
import { dataBR, hojeISO, inicioDoMesSeguinte, primeiroDiaDoMes } from "@/lib/dates";
import {
  agruparSaldoPorCategoria,
  calcularSaldoAcerto,
  filtrarSettlements,
} from "@/lib/splits";
import type {
  Category,
  Profile,
  Settlement,
  SplitLedgerRow,
} from "@/lib/database.types";

import { desfazerAcerto, registrarAcerto } from "./actions";

export function AcertoClient({
  ledger,
  settlements,
  categorias,
  eu,
  parceiro,
  moedaCasal,
}: {
  ledger: SplitLedgerRow[];
  settlements: Settlement[];
  categorias: Pick<Category, "id" | "name" | "icon">[];
  eu: Profile;
  parceiro: Profile;
  moedaCasal: string;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [valor, setValor] = useState("");
  const [nota, setNota] = useState("");
  const [buscaHistorico, setBuscaHistorico] = useState("");

  // Positivo: parceiro deve para mim. Negativo: eu devo para o parceiro.
  const saldo = calcularSaldoAcerto(ledger, settlements, eu.id, parceiro.id);
  const quitado = saldo === 0;
  const parceiroDeve = saldo > 0;
  const valorAbs = Math.abs(saldo);

  const devedor = parceiroDeve ? parceiro : eu;
  const credor = parceiroDeve ? eu : parceiro;

  // Saldo só do mês atual (sem descontar acertos já feitos) — base dos
  // atalhos "metade do mês"/"mês inteiro": quando a divisão não bateu (ex.
  // o outro pagou a Vodafone mas não registrou), esses dois valores cobrem
  // o caso mais comum sem precisar somar nada na mão.
  const mesAtual = primeiroDiaDoMes(hojeISO());
  const proximoMes = inicioDoMesSeguinte(mesAtual);
  const ledgerDoMes = ledger.filter(
    (l) => l.occurred_on >= mesAtual && l.occurred_on < proximoMes,
  );
  const saldoMesAbs = Math.abs(
    calcularSaldoAcerto(ledgerDoMes, [], eu.id, parceiro.id),
  );

  function abrirAcerto() {
    setValor(valorAbs > 0 ? formatAmount(valorAbs) : "");
    setNota("");
    setDialogAberto(true);
  }

  function confirmarAcerto(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseBRL(valor);
    if (cents === null || cents <= 0) {
      toast.error("Valor inválido.");
      return;
    }
    startTransition(async () => {
      const r = await registrarAcerto(devedor.id, credor.id, cents, nota);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui registrar.");
        return;
      }
      toast.success("Acerto registrado.");
      setDialogAberto(false);
      router.refresh();
    });
  }

  function desfazer(id: string) {
    startTransition(async () => {
      const r = await desfazerAcerto(id);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui desfazer.");
        return;
      }
      toast.success("Acerto desfeito.");
      router.refresh();
    });
  }

  const historico = useMemo(
    () =>
      filtrarSettlements(settlements, { termo: buscaHistorico }).sort((a, b) =>
        b.settled_on.localeCompare(a.settled_on),
      ),
    [settlements, buscaHistorico],
  );

  const origens = useMemo(
    () => agruparSaldoPorCategoria(ledger, categorias, eu.id, parceiro.id),
    [ledger, categorias, eu.id, parceiro.id],
  );
  const maiorOrigem = Math.max(...origens.map((o) => Math.abs(o.saldo)), 1);

  return (
    <PageShell>
      <PageHeader
        titulo="Acerto de contas"
        descricao="Só o que foi marcado como dividido entra aqui."
      />

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          {quitado ? (
            <>
              <div className="text-4xl">✅</div>
              <p className="text-lg font-medium">Está tudo acertado</p>
              <p className="text-muted-foreground text-sm">
                Nenhuma pendência entre {eu.display_name} e{" "}
                {parceiro.display_name}.
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl">{devedor.avatar_emoji}</div>
              <p className="text-lg">
                <span className="font-semibold">{devedor.display_name}</span>{" "}
                deve{" "}
                <span className="font-semibold tabular-nums">
                  {formatMoney(valorAbs, moedaCasal)}
                </span>{" "}
                para{" "}
                <span className="font-semibold">{credor.display_name}</span>
              </p>
              <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
                <DialogTrigger asChild>
                  <Button onClick={abrirAcerto}>
                    <HandCoins className="size-4" />
                    Marcar como acertado
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar acerto</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={confirmarAcerto} className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                      {devedor.display_name} → {credor.display_name}
                    </p>
                    <MoneyInput
                      label="Valor pago"
                      value={valor}
                      onChange={setValor}
                      currency={moedaCasal}
                    />
                    {saldoMesAbs > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground text-xs">Atalhos deste mês:</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setValor(formatAmount(Math.round(saldoMesAbs / 2)))}
                        >
                          Metade ({formatMoney(Math.round(saldoMesAbs / 2), moedaCasal)})
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setValor(formatAmount(saldoMesAbs))}
                        >
                          Mês inteiro ({formatMoney(saldoMesAbs, moedaCasal)})
                        </Button>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="nota-acerto">Nota (opcional)</Label>
                      <Input
                        id="nota-acerto"
                        placeholder="Pix, dinheiro…"
                        value={nota}
                        onChange={(e) => setNota(e.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={pendente}>
                        {pendente ? "Salvando…" : "Confirmar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardContent>
      </Card>

      {origens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              De onde vem essa diferença
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              Composição das despesas divididas. Não desconta os acertos já
              feitos — acerto não tem categoria para abater.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {origens.slice(0, 5).map((o) => {
              const aFavorDeMim = o.saldo > 0;
              return (
                <div
                  key={o.categoryId ?? "sem-categoria"}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="mr-1.5">{o.icone}</span>
                      {o.nome}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {aFavorDeMim ? parceiro.display_name : eu.display_name}{" "}
                      deve{" "}
                      <span className="text-foreground font-semibold">
                        {formatMoney(Math.abs(o.saldo), moedaCasal)}
                      </span>
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max((Math.abs(o.saldo) / maiorOrigem) * 100, 3)}%`,
                        backgroundColor: aFavorDeMim
                          ? "var(--chart-pessoa-1)"
                          : "var(--chart-pessoa-2)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {settlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de acertos</CardTitle>
            <div className="relative pt-2">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 translate-y-[calc(-50%+0.25rem)]" />
              <Input
                className="h-8 pl-8"
                placeholder="Buscar por nota (Pix, dinheiro…)"
                value={buscaHistorico}
                onChange={(e) => setBuscaHistorico(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="divide-border/70 divide-y p-0">
            {historico.length === 0 ? (
              <p className="text-muted-foreground px-4 py-6 text-center text-sm">
                Nenhum acerto com essa nota.
              </p>
            ) : (
              historico.map((s) => {
                const de = s.from_profile === eu.id ? eu : parceiro;
                const para = s.to_profile === eu.id ? eu : parceiro;
                return (
                  <ListRow key={s.id}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        {de.display_name} → {para.display_name}
                        {s.note && (
                          <Badge variant="outline" className="ml-2 font-normal">
                            {s.note}
                          </Badge>
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {dataBR(s.settled_on)}
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {formatMoney(s.amount_cents, moedaCasal)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => desfazer(s.id)}
                      disabled={pendente}
                      aria-label="Desfazer"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </ListRow>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
