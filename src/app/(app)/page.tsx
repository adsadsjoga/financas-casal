import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Plus, Upload, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import {
  addMeses,
  hojeISO,
  inicioDoMesSeguinte,
  nomeDoMes,
  primeiroDiaDoMes,
} from "@/lib/dates";
import { agregarDespesasPorCategoria, agregarFluxoMensal } from "@/lib/dashboard";
import {
  GraficoDespesasPorCategoria,
  GraficoFluxoMensal,
} from "@/components/app/dashboard-charts";
import type { Account, AccountBalance, Category } from "@/lib/database.types";

export const metadata = { title: "Início · Finanças do Casal" };

export default async function DashboardPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const mesAtual = primeiroDiaDoMes(hojeISO());
  const proximoMes = inicioDoMesSeguinte(mesAtual);
  const inicioJanela6Meses = addMeses(mesAtual, -5);

  const [contasRes, saldosRes, mesRes, janela6MesesRes, categoriasRes] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("couple_id", session.couple.id)
      .eq("archived", false)
      .order("created_at"),
    supabase.from("account_balances").select("*").eq("couple_id", session.couple.id),
    supabase
      .from("transactions")
      .select("type, amount_primary_cents")
      .eq("couple_id", session.couple.id)
      .gte("occurred_on", mesAtual)
      .lt("occurred_on", proximoMes),
    supabase
      .from("transactions")
      .select("type, occurred_on, category_id, amount_primary_cents")
      .eq("couple_id", session.couple.id)
      .gte("occurred_on", inicioJanela6Meses)
      .lt("occurred_on", proximoMes),
    supabase.from("categories").select("id, name, icon").eq("couple_id", session.couple.id),
  ]);

  const moeda = session.couple.primary_currency;
  const contas = (contasRes.data ?? []) as Account[];
  const saldos = new Map(
    ((saldosRes.data ?? []) as AccountBalance[]).map((s) => [s.account_id, s]),
  );

  // Totais do mês e patrimônio somam na moeda principal — só assim conta em
  // euro e conta em real cabem no mesmo número.
  const movimentos = mesRes.data ?? [];
  const entradas = movimentos
    .filter((t) => t.type === "receita")
    .reduce((acc, t) => acc + t.amount_primary_cents, 0);
  const saidas = movimentos
    .filter((t) => t.type === "despesa")
    .reduce((acc, t) => acc + t.amount_primary_cents, 0);

  const patrimonio = contas.reduce(
    (acc, c) =>
      acc + (saldos.get(c.id)?.balance_primary_cents ?? c.initial_balance_cents),
    0,
  );

  const moedasEmUso = new Set(contas.map((c) => c.currency));
  const multiMoeda = moedasEmUso.size > 1;
  const semDados = contas.length === 0;

  const janela6Meses = janela6MesesRes.data ?? [];
  const fluxoMensal = agregarFluxoMensal(janela6Meses, mesAtual, 6);
  const despesasDoMes = janela6Meses.filter((t) => t.occurred_on >= mesAtual);
  const despesasPorCategoria = agregarDespesasPorCategoria(
    despesasDoMes,
    (categoriasRes.data ?? []) as Pick<Category, "id" | "name" | "icon">[],
  );

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
                  {formatMoney(patrimonio, moeda)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Contas menos faturas de cartão
                  {multiMoeda && `, convertido para ${moeda}`}
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
                  {formatMoney(entradas, moeda)}
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
                  {formatMoney(saidas, moeda)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Sobrou {formatMoney(entradas - saidas, moeda)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GraficoFluxoMensal dados={fluxoMensal} moeda={moeda} />
            <GraficoDespesasPorCategoria dados={despesasPorCategoria} moeda={moeda} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contas.map((conta) => {
                const saldo =
                  saldos.get(conta.id)?.balance_cents ?? conta.initial_balance_cents;
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
                        <p className="text-muted-foreground text-xs">
                          {dono}
                          {conta.currency !== moeda && ` · ${conta.currency}`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-medium tabular-nums ${
                        saldo < 0 ? "text-rose-600" : ""
                      }`}
                    >
                      {formatMoney(saldo, conta.currency)}
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
