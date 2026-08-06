"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, HandCoins, Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListEmpty } from "@/components/app/list-card";
import { ContraparteCombobox } from "@/components/app/contraparte-combobox";
import { dataBR, hojeISO } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { ResumoEmprestimo } from "@/lib/emprestimos";
import type { Loan, LoanDirection } from "@/lib/database.types";

import { salvarEmprestimo } from "./actions";

export function EmprestimosClient({
  loans,
  resumos,
  contrapartes,
  moeda,
}: {
  loans: Loan[];
  resumos: Record<string, ResumoEmprestimo>;
  contrapartes: Array<{ id: string; name: string }>;
  moeda: string;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [dialogAberto, setDialogAberto] = useState(false);

  const [direction, setDirection] = useState<LoanDirection>("emprestei");
  const [descricao, setDescricao] = useState("");
  const [principal, setPrincipal] = useState("");
  const [occurredOn, setOccurredOn] = useState(hojeISO());
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [pessoaNome, setPessoaNome] = useState("");
  const [counterpartyId, setCounterpartyId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const contrapartesPorId = new Map(contrapartes.map((c) => [c.id, c]));

  function abrirNovo() {
    setDirection("emprestei");
    setDescricao("");
    setPrincipal("");
    setOccurredOn(hojeISO());
    setExpectedReturnDate("");
    setPessoaNome("");
    setCounterpartyId(null);
    setNotes("");
    setDialogAberto(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await salvarEmprestimo({
        direction,
        description: descricao,
        principal,
        occurredOn,
        expectedReturnDate,
        counterpartyId,
        notes,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar.");
        return;
      }
      toast.success("Empréstimo cadastrado.");
      setDialogAberto(false);
      router.push("/emprestimos/" + r.id);
    });
  }

  const ativos = loans.filter((l) => !l.archived);
  const aReceber = ativos.filter((l) => l.direction === "emprestei");
  const aPagar = ativos.filter((l) => l.direction === "peguei_emprestado");
  const quitados = loans.filter((l) => l.archived);

  return (
    <PageShell largura="painel" className="pb-8">
      <PageHeader
        sobretitulo="Patrimônio"
        titulo="Empréstimos"
        descricao="O que você emprestou e o que pegou emprestado, conciliado com o extrato."
        acao={
          <Button onClick={abrirNovo}>
            <Plus className="size-4" />
            Novo empréstimo
          </Button>
        }
      />

      {ativos.length === 0 && quitados.length === 0 ? (
        <ListEmpty
          icone={<HandCoins className="size-6" />}
          titulo="Nenhum empréstimo cadastrado ainda"
          descricao="Registre tanto o que você emprestou pra alguém quanto o que pegou emprestado."
          acao={
            <Button onClick={abrirNovo}>
              <Plus className="size-4" />
              Cadastrar empréstimo
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <Grupo
            titulo="A receber"
            itens={aReceber}
            resumos={resumos}
            contrapartesPorId={contrapartesPorId}
            moeda={moeda}
          />
          <Grupo
            titulo="A pagar"
            itens={aPagar}
            resumos={resumos}
            contrapartesPorId={contrapartesPorId}
            moeda={moeda}
          />
          <Grupo
            titulo="Quitados"
            itens={quitados}
            resumos={resumos}
            contrapartesPorId={contrapartesPorId}
            moeda={moeda}
          />
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo empréstimo</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4">
            <div className="space-y-2">
              <Label>Direção</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as LoanDirection)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emprestei">Eu emprestei (a receber)</SelectItem>
                  <SelectItem value="peguei_emprestado">Peguei emprestado (a pagar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                required
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: Ajuda pra reforma"
              />
            </div>
            <div className="space-y-2">
              <Label>Pessoa/empresa</Label>
              <ContraparteCombobox
                contrapartes={contrapartes}
                texto={pessoaNome}
                onTextoChange={setPessoaNome}
                onSelecionar={setCounterpartyId}
                placeholder="Nome de quem empresta/pega"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  required
                  inputMode="decimal"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  placeholder="500,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  required
                  type="date"
                  value={occurredOn}
                  onChange={(e) => setOccurredOn(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Previsão de devolução (opcional)</Label>
                <Input
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <textarea
                className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2 text-sm outline-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pendente}>
                {pendente ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function Grupo({
  titulo,
  itens,
  resumos,
  contrapartesPorId,
  moeda,
}: {
  titulo: string;
  itens: Loan[];
  resumos: Record<string, ResumoEmprestimo>;
  contrapartesPorId: Map<string, { id: string; name: string }>;
  moeda: string;
}) {
  if (itens.length === 0) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-muted-foreground text-sm font-medium">{titulo}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {itens.map((l) => {
          const r = resumos[l.id];
          const contraparte = l.counterparty_id ? contrapartesPorId.get(l.counterparty_id) : null;
          const quitado = r && r.saldo <= 0;
          return (
            <Link key={l.id} href={"/emprestimos/" + l.id}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="bg-secondary flex size-10 shrink-0 items-center justify-center rounded-lg">
                        {l.direction === "emprestei" ? (
                          <ArrowDownLeft className="size-5 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="size-5 text-rose-600" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{l.description}</p>
                        <p className="text-muted-foreground text-xs">
                          {contraparte?.name ?? "Sem contraparte"} · {dataBR(l.occurred_on)}
                        </p>
                        {l.archived && (
                          <Badge className="mt-2" variant="secondary">
                            Quitado
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="shrink-0 text-right text-sm font-bold tabular-nums">
                      {formatMoney(l.principal_cents, moeda)}
                    </p>
                  </div>
                  {r && (
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Já pago</p>
                        <p className="mt-1 font-medium tabular-nums">
                          {formatMoney(r.pagoTotal, moeda)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          {l.direction === "emprestei" ? "Saldo a receber" : "Saldo a pagar"}
                        </p>
                        <p
                          className={
                            "mt-1 font-medium tabular-nums " + (quitado ? "text-emerald-600" : "")
                          }
                        >
                          {formatMoney(Math.max(r.saldo, 0), moeda)}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
