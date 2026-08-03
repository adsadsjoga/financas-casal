import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Plus,
  Sparkles,
  Upload,
  Wallet,
} from "lucide-react";

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
import { CATEGORIAS_FORA_DO_RESULTADO } from "@/lib/constants";
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

  const [contasRes, saldosRes, mesRes, janela6MesesRes, categoriasRes, linksCarrosRes] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("*")
        .eq("couple_id", session.couple.id)
        .eq("archived", false)
        .order("created_at"),
      supabase.from("account_balances").select("*").eq("couple_id", session.couple.id),
      supabase
        .from("transactions")
        .select("id, type, category_id, amount_primary_cents")
        .eq("couple_id", session.couple.id)
        .in("type", ["receita", "despesa"])
        .gte("occurred_on", mesAtual)
        .lt("occurred_on", proximoMes),
      supabase
        .from("transactions")
        .select("id, type, occurred_on, category_id, amount_primary_cents")
        .eq("couple_id", session.couple.id)
        .in("type", ["receita", "despesa"])
        .gte("occurred_on", inicioJanela6Meses)
        .lt("occurred_on", proximoMes),
      supabase.from("categories").select("id, name, icon").eq("couple_id", session.couple.id),
      supabase
        .from("vehicle_transaction_links")
        .select("transaction_id")
        .eq("couple_id", session.couple.id),
    ]);

  if (saldosRes.error) {
    console.error("Erro ao carregar account_balances na home:", saldosRes.error);
  }

  const moeda = session.couple.primary_currency;
  const contas = (contasRes.data ?? []) as Account[];
  const saldos = new Map(
    ((saldosRes.data ?? []) as AccountBalance[]).map((s) => [s.account_id, s]),
  );

  const categorias = (categoriasRes.data ?? []) as Pick<Category, "id" | "name" | "icon">[];
  const categoriasForaDoResultado = new Set(
    categorias
      .filter((c) => CATEGORIAS_FORA_DO_RESULTADO.includes(c.name))
      .map((c) => c.id),
  );
  const transacoesDeCarros = new Set(
    (linksCarrosRes.data ?? []).map((l) => l.transaction_id),
  );
  const foraDoResultado = (t: { id: string; category_id: string | null }) =>
    (t.category_id !== null && categoriasForaDoResultado.has(t.category_id)) ||
    transacoesDeCarros.has(t.id);

  // Totais do mês e patrimônio somam na moeda principal — só assim conta em
  // euro e conta em real cabem no mesmo número. Giro entre bolsos próprios
  // (transferências internas, saques) e negócio de carros ficam fora: não
  // são gasto/receita real do casal.
  const movimentos = (mesRes.data ?? []).filter((t) => !foraDoResultado(t));
  const entradas = movimentos
    .filter((t) => t.type === "receita")
    .reduce((acc, t) => acc + t.amount_primary_cents, 0);
  const saidas = movimentos
    .filter((t) => t.type === "despesa")
    .reduce((acc, t) => acc + t.amount_primary_cents, 0);

  const patrimonio = contas.reduce(
    (acc, c) => acc + (saldos.get(c.id)?.balance_primary_cents ?? 0),
    0,
  );

  const moedasEmUso = new Set(contas.map((c) => c.currency));
  const multiMoeda = moedasEmUso.size > 1;
  const semDados = contas.length === 0;

  const janela6Meses = (janela6MesesRes.data ?? []).filter((t) => !foraDoResultado(t));
  const fluxoMensal = agregarFluxoMensal(janela6Meses, mesAtual, 6);
  const despesasDoMes = janela6Meses.filter((t) => t.occurred_on >= mesAtual);
  const despesasPorCategoria = agregarDespesasPorCategoria(despesasDoMes, categorias);

  return (
    <div className="mx-auto max-w-5xl space-y-5 md:space-y-7">
      <div className="flex items-end justify-between gap-4">
        <div>
        <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-[0.14em]">
          Visão geral
        </p>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Olá, {session.profile.display_name.split(" ")[0]}
        </h1>
        </div>
        <span className="bg-card text-muted-foreground rounded-lg px-3 py-2 text-xs font-semibold capitalize shadow-sm ring-1 ring-foreground/7">
          {nomeDoMes(mesAtual)}
        </span>
      </div>

      {semDados ? (
        <Card className="border-dashed bg-card/70 shadow-none">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="bg-secondary text-secondary-foreground flex size-12 items-center justify-center rounded-lg">
              <Wallet className="size-6" />
            </span>
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
          <Card className="bg-primary text-primary-foreground shadow-[0_14px_40px_oklch(0.25_0.08_164/0.2)] ring-0">
            <CardContent className="space-y-5 pt-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.13em] text-primary-foreground/65">
                    Patrimônio total
                  </p>
                  <p className="mt-1.5 text-[clamp(1.75rem,8vw,2.5rem)] leading-tight font-bold tabular-nums">
                  {formatMoney(patrimonio, moeda)}
                  </p>
                  <p className="mt-1 text-xs text-primary-foreground/60">
                    Contas menos faturas{multiMoeda && ` · convertido para ${moeda}`}
                  </p>
                </div>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Sparkles className="size-4" />
                </span>
              </div>

              <div className="grid grid-cols-2 divide-x divide-white/15 border-t border-white/15 pt-4">
                <div className="pr-4">
                  <p className="flex items-center gap-1 text-xs text-primary-foreground/65">
                    <ArrowUpRight className="size-3.5" style={{ color: "var(--chart-1)" }} />
                    Entrou
                  </p>
                  <p className="mt-1 truncate text-base font-bold tabular-nums sm:text-lg">
                    {formatMoney(entradas, moeda)}
                  </p>
                </div>
                <div className="pl-4">
                  <p className="flex items-center gap-1 text-xs text-primary-foreground/65">
                    <ArrowDownRight className="size-3.5" style={{ color: "var(--chart-2)" }} />
                    Saiu
                  </p>
                  <p className="mt-1 truncate text-base font-bold tabular-nums sm:text-lg">
                    {formatMoney(saidas, moeda)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md bg-black/10 px-3 py-2 text-xs">
                <span className="text-primary-foreground/65">Saldo do mês</span>
                <span className="font-bold tabular-nums">{formatMoney(entradas - saidas, moeda)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="justify-between">
              <Link href="/transacoes"><span className="flex items-center gap-2"><Plus className="size-4" /> Lançamento</span><ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/importar"><span className="flex items-center gap-2"><Upload className="size-4" /> Importar</span><ArrowRight className="size-4" /></Link>
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GraficoFluxoMensal dados={fluxoMensal} moeda={moeda} />
            <GraficoDespesasPorCategoria dados={despesasPorCategoria} moeda={moeda} />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Suas contas</CardTitle>
                <p className="text-muted-foreground mt-0.5 text-xs">Saldos atualizados</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/contas">Ver todas <ChevronRight className="size-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {contas.map((conta) => {
                const saldo = saldos.get(conta.id)?.balance_cents ?? 0;
                const dono = conta.owner_profile_id
                  ? (session.members.find(
                      (m) => m.profile_id === conta.owner_profile_id,
                    )?.profile.display_name ?? "—")
                  : "Conjunta";
                return (
                  <div
                    key={conta.id}
                    className="flex min-h-14 items-center justify-between gap-3 border-b border-border/70 py-2.5 last:border-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: conta.color }} />
                      </span>
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
