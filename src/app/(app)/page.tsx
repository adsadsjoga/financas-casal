import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Plus, Upload, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/money";
import {
  hojeISO,
  inicioDoMesSeguinte,
  nomeDoMes,
  primeiroDiaDoMes,
} from "@/lib/dates";
import type { Account, AccountBalance } from "@/lib/database.types";

export const metadata = { title: "Início · Finanças do Casal" };

export default async function DashboardPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const mesAtual = primeiroDiaDoMes(hojeISO());
  const proximoMes = inicioDoMesSeguinte(mesAtual);

  const [contasRes, saldosRes, mesRes] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("couple_id", session.couple.id)
      .eq("archived", false)
      .order("created_at"),
    supabase.from("account_balances").select("*").eq("couple_id", session.couple.id),
    supabase
      .from("transactions")
      .select("type, amount_cents")
      .eq("couple_id", session.couple.id)
      .gte("occurred_on", mesAtual)
      .lt("occurred_on", proximoMes),
  ]);

  const contas = (contasRes.data ?? []) as Account[];
  const saldos = new Map(
    ((saldosRes.data ?? []) as AccountBalance[]).map((s) => [
      s.account_id,
      s.balance_cents,
    ]),
  );

  const movimentos = mesRes.data ?? [];
  const entradas = movimentos
    .filter((t) => t.type === "receita")
    .reduce((acc, t) => acc + t.amount_cents, 0);
  const saidas = movimentos
    .filter((t) => t.type === "despesa")
    .reduce((acc, t) => acc + t.amount_cents, 0);

  const patrimonio = contas.reduce(
    (acc, c) => acc + (saldos.get(c.id) ?? c.initial_balance_cents),
    0,
  );

  const semDados = contas.length === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {session.profile.display_name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm">{nomeDoMes(mesAtual)}</p>
      </div>

      {semDados ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <Wallet className="text-muted-foreground size-8" />
            <div>
              <p className="font-medium">Nada por aqui ainda</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Cadastre as contas de vocês ou importe um extrato do banco para
                começar com dados reais.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/contas">
                  <Plus className="size-4" />
                  Cadastrar conta
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/importar">
                  <Upload className="size-4" />
                  Importar extrato
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Patrimônio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatBRL(patrimonio)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Contas menos faturas de cartão
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
                  <ArrowUpRight className="size-4 text-emerald-600" />
                  Entrou no mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums text-emerald-600">
                  {formatBRL(entradas)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground flex items-center gap-1 text-sm font-medium">
                  <ArrowDownRight className="size-4 text-rose-600" />
                  Saiu no mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums text-rose-600">
                  {formatBRL(saidas)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Sobrou {formatBRL(entradas - saidas)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contas.map((conta) => {
                const saldo = saldos.get(conta.id) ?? conta.initial_balance_cents;
                const dono = conta.owner_profile_id
                  ? (session.members.find(
                      (m) => m.profile_id === conta.owner_profile_id,
                    )?.profile.display_name ?? "—")
                  : "Conjunta";
                return (
                  <div
                    key={conta.id}
                    className="flex items-center justify-between gap-3 border-b py-2 last:border-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: conta.color }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{conta.name}</p>
                        <p className="text-muted-foreground text-xs">{dono}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-medium tabular-nums ${
                        saldo < 0 ? "text-rose-600" : ""
                      }`}
                    >
                      {formatBRL(saldo)}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
