"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { formatMoney, parseBRL } from "@/lib/money";
import { dataBR } from "@/lib/dates";
import { calcularSaldoAcerto } from "@/lib/splits";
import type { Profile, Settlement, SplitLedgerRow } from "@/lib/database.types";

import { desfazerAcerto, registrarAcerto } from "./actions";

export function AcertoClient({
  ledger,
  settlements,
  eu,
  parceiro,
  moedaCasal,
}: {
  ledger: SplitLedgerRow[];
  settlements: Settlement[];
  eu: Profile;
  parceiro: Profile;
  moedaCasal: string;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [valor, setValor] = useState("");
  const [nota, setNota] = useState("");

  // Positivo: parceiro deve para mim. Negativo: eu devo para o parceiro.
  const saldo = calcularSaldoAcerto(ledger, settlements, eu.id, parceiro.id);
  const quitado = saldo === 0;
  const parceiroDeve = saldo > 0;
  const valorAbs = Math.abs(saldo);

  const devedor = parceiroDeve ? parceiro : eu;
  const credor = parceiroDeve ? eu : parceiro;

  function abrirAcerto() {
    setValor(valorAbs > 0 ? (valorAbs / 100).toFixed(2).replace(".", ",") : "");
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

  const historico = [...settlements].sort((a, b) =>
    b.settled_on.localeCompare(a.settled_on),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Acerto de contas</h1>
        <p className="text-muted-foreground text-sm">
          Só o que foi marcado como dividido entra aqui.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          {quitado ? (
            <>
              <div className="text-4xl">✅</div>
              <p className="text-lg font-medium">Está tudo acertado</p>
              <p className="text-muted-foreground text-sm">
                Nenhuma pendência entre {eu.display_name} e {parceiro.display_name}.
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl">{devedor.avatar_emoji}</div>
              <p className="text-lg">
                <span className="font-semibold">{devedor.display_name}</span> deve{" "}
                <span className="font-semibold tabular-nums">
                  {formatMoney(valorAbs, moedaCasal)}
                </span>{" "}
                para <span className="font-semibold">{credor.display_name}</span>
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
                    <MoneyInput label="Valor pago" value={valor} onChange={setValor} />
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

      {historico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de acertos</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {historico.map((s) => {
              const de = s.from_profile === eu.id ? eu : parceiro;
              const para = s.to_profile === eu.id ? eu : parceiro;
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
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
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
