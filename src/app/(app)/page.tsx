import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChevronRight,
  Plus,
  Sparkles,
  Upload,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListRow, ListEmpty } from "@/components/app/list-card";
import { CardDestaque } from "@/components/app/card-destaque";
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
import {
  agregarDespesasPorCategoria,
  agregarFluxoMensal,
  agregarGastosPorPessoa,
  maioresDespesas,
} from "@/lib/dashboard";
import { estaForaDoResultado } from "@/lib/constants";
import { GraficoFluxoMensal } from "@/components/app/dashboard-charts";
import { CustosDoMes } from "@/components/app/custos-do-mes";
import { SeletorVisao } from "@/components/app/seletor-visao";
import type { Account, AccountBalance, Category } from "@/lib/database.types";

export const metadata = { title: "Início · Finanças do Casal" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; visao?: string }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const params = await searchParams;

  const mesAtual = primeiroDiaDoMes(hojeISO());
  // Mês da seção de custos. Não navega para o futuro: lá não há dado, só
  // confundiria quem clicasse.
  const mesPedido = /^\d{4}-\d{2}-\d{2}$/.test(params.mes ?? "")
    ? primeiroDiaDoMes(params.mes!)
    : mesAtual;
  const mes = mesPedido > mesAtual ? mesAtual : mesPedido;
  const proximoMes = inicioDoMesSeguinte(mes);
  const proximoMesAtual = inicioDoMesSeguinte(mesAtual);
  const inicioJanela6Meses = addMeses(mesAtual, -5);

  // Visão individual só existe com parceiro cadastrado — sozinho, "Gabriel" e
  // "Casal" mostrariam exatamente a mesma coisa.
  const visoesValidas = session.partner
    ? ["casal", session.me.profile_id, session.partner.profile_id]
    : ["casal"];
  // Ao abrir sem `?visao=` explícito, começa na visão da própria pessoa, não
  // no casal — cada um quer ver o que é seu primeiro.
  const visaoPadrao = session.partner ? session.me.profile_id : "casal";
  const visao = visoesValidas.includes(params.visao ?? "")
    ? params.visao!
    : visaoPadrao;
  const pessoaDaVisao = visao === "casal" ? null : visao;

  let contasQuery = supabase
    .from("accounts")
    .select("*")
    .eq("couple_id", session.couple.id)
    .eq("archived", false)
    .order("created_at");

  let mesQuery = supabase
    .from("transactions")
    .select(
      "id, type, category_id, payer_profile_id, description, amount_primary_cents",
    )
    .eq("couple_id", session.couple.id)
    .in("type", ["receita", "despesa"])
    .gte("occurred_on", mes)
    .lt("occurred_on", proximoMes);

  let janela6MesesQuery = supabase
    .from("transactions")
    .select("id, type, occurred_on, category_id, amount_primary_cents")
    .eq("couple_id", session.couple.id)
    .in("type", ["receita", "despesa"])
    .gte("occurred_on", inicioJanela6Meses)
    .lt("occurred_on", proximoMesAtual);

  if (pessoaDaVisao) {
    // Conta conjunta fica fora do individual de propósito: não tem dono
    // único, e somar metade sem uma regra explícita inventaria patrimônio.
    contasQuery = contasQuery.eq("owner_profile_id", pessoaDaVisao);
    mesQuery = mesQuery.eq("payer_profile_id", pessoaDaVisao);
    janela6MesesQuery = janela6MesesQuery.eq("payer_profile_id", pessoaDaVisao);
  }

  const [
    contasRes,
    saldosRes,
    mesRes,
    janela6MesesRes,
    categoriasRes,
    linksCarrosRes,
    revisarRes,
  ] = await Promise.all([
    contasQuery,
    supabase
      .from("account_balances")
      .select("*")
      .eq("couple_id", session.couple.id),
    mesQuery,
    janela6MesesQuery,
    supabase
      .from("categories")
      .select("id, name, icon")
      .eq("couple_id", session.couple.id),
    supabase
      .from("vehicle_transaction_links")
      .select("transaction_id")
      .eq("couple_id", session.couple.id),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("couple_id", session.couple.id)
      .eq("needs_review", true),
  ]);

  const pendentesRevisao = revisarRes.count ?? 0;

  if (saldosRes.error) {
    console.error(
      "Erro ao carregar account_balances na home:",
      saldosRes.error,
    );
  }

  const moeda = session.couple.primary_currency;
  const contas = (contasRes.data ?? []) as Account[];
  const saldos = new Map(
    ((saldosRes.data ?? []) as AccountBalance[]).map((s) => [s.account_id, s]),
  );

  const categorias = (categoriasRes.data ?? []) as Pick<
    Category,
    "id" | "name" | "icon"
  >[];
  const categoriasForaDoResultado = new Set(
    categorias
      .filter((c) => estaForaDoResultado(c.name))
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

  const janela6Meses = (janela6MesesRes.data ?? []).filter(
    (t) => !foraDoResultado(t),
  );
  const fluxoMensal = agregarFluxoMensal(janela6Meses, mesAtual, 6);

  // Custos vêm da consulta do mês escolhido, não da janela de 6 meses — assim
  // dá para navegar para trás sem o teto dos 6 meses do gráfico de fluxo.
  const despesasDoMes = movimentos.filter((t) => t.type === "despesa");
  const despesasPorCategoria = agregarDespesasPorCategoria(
    despesasDoMes,
    categorias,
  );
  const gastosPorPessoa =
    visao === "casal" && session.partner
      ? agregarGastosPorPessoa(
          despesasDoMes,
          session.members.map((m) => ({
            profile_id: m.profile_id,
            display_name: m.profile.display_name,
            avatar_emoji: m.profile.avatar_emoji,
          })),
        )
      : null;
  const topDespesas = maioresDespesas(
    despesasDoMes.map((t) => ({
      description: t.description,
      amount_cents: t.amount_primary_cents,
    })),
  );

  const opcoesVisao = session.partner
    ? [
        { valor: "casal", rotulo: "Casal", icone: "👥" },
        {
          valor: session.me.profile_id,
          rotulo: session.profile.display_name.split(" ")[0],
          icone: session.profile.avatar_emoji,
        },
        {
          valor: session.partner.profile_id,
          rotulo: session.partner.profile.display_name.split(" ")[0],
          icone: session.partner.profile.avatar_emoji,
        },
      ]
    : [];

  return (
    <PageShell largura="painel">
      <PageHeader
        sobretitulo="Visão geral"
        titulo={`Olá, ${session.profile.display_name.split(" ")[0]}`}
        acao={
          <span className="bg-card text-muted-foreground rounded-lg px-3 py-2 text-xs font-semibold capitalize shadow-sm ring-1 ring-foreground/7">
            {nomeDoMes(mes)}
          </span>
        }
      />

      {opcoesVisao.length > 0 && (
        <SeletorVisao opcoes={opcoesVisao} atual={visao} mes={mes} />
      )}

      {pendentesRevisao > 0 && (
        <Link
          href="/revisar"
          className="border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors"
        >
          <span className="bg-amber-500/20 flex size-9 shrink-0 items-center justify-center rounded-full">
            <Bell className="size-4 text-amber-700" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {pendentesRevisao} lançamento{pendentesRevisao === 1 ? "" : "s"}{" "}
              para revisar
            </p>
            <p className="text-muted-foreground text-xs">
              Categoria genérica de uma importação — dá pra corrigir rapidinho.
            </p>
          </div>
          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        </Link>
      )}

      {semDados ? (
        <ListEmpty
          icone={<Wallet className="size-6" />}
          titulo="Nada por aqui ainda"
          descricao="Cadastre as contas de vocês ou importe um extrato do banco para começar com dados reais."
          acao={
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
          }
        />
      ) : (
        <>
          <CardDestaque
            rotulo={
              pessoaDaVisao ? "Patrimônio individual" : "Patrimônio total"
            }
            valor={formatMoney(patrimonio, moeda)}
            nota={
              <>
                {pessoaDaVisao ? "Só contas próprias" : "Contas menos faturas"}
                {multiMoeda && ` · convertido para ${moeda}`}
              </>
            }
            icone={<Sparkles className="size-4" />}
          >
            <div className="grid grid-cols-2 divide-x divide-white/15 border-t border-white/15 pt-4">
              <div className="pr-4">
                <p className="flex items-center gap-1 text-xs text-primary-foreground/65">
                  <ArrowUpRight
                    className="size-3.5"
                    style={{ color: "var(--chart-1)" }}
                  />
                  Entrou
                </p>
                <p className="mt-1 truncate text-base font-bold tabular-nums sm:text-lg">
                  {formatMoney(entradas, moeda)}
                </p>
              </div>
              <div className="pl-4">
                <p className="flex items-center gap-1 text-xs text-primary-foreground/65">
                  <ArrowDownRight
                    className="size-3.5"
                    style={{ color: "var(--chart-2)" }}
                  />
                  Saiu
                </p>
                <p className="mt-1 truncate text-base font-bold tabular-nums sm:text-lg">
                  {formatMoney(saidas, moeda)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md bg-black/10 px-3 py-2 text-xs">
              <span className="text-primary-foreground/65">Saldo do mês</span>
              <span className="font-bold tabular-nums">
                {formatMoney(entradas - saidas, moeda)}
              </span>
            </div>
          </CardDestaque>

          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="justify-between">
              <Link href="/transacoes">
                <span className="flex items-center gap-2">
                  <Plus className="size-4" /> Lançamento
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/importar">
                <span className="flex items-center gap-2">
                  <Upload className="size-4" /> Importar
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <GraficoFluxoMensal dados={fluxoMensal} moeda={moeda} />

          <CustosDoMes
            mes={mes}
            mesAtual={mesAtual}
            visao={visao}
            despesasPorCategoria={despesasPorCategoria}
            gastosPorPessoa={gastosPorPessoa}
            maioresDespesas={topDespesas}
            moeda={moeda}
          />

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {pessoaDaVisao ? "Contas próprias" : "Suas contas"}
                </CardTitle>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Saldos atualizados
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/contas">
                  Ver todas <ChevronRight className="size-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="divide-border/70 divide-y p-0">
              {contas.map((conta) => {
                const saldo = saldos.get(conta.id)?.balance_cents ?? 0;
                const dono = conta.owner_profile_id
                  ? (session.members.find(
                      (m) => m.profile_id === conta.owner_profile_id,
                    )?.profile.display_name ?? "—")
                  : "Conjunta";
                return (
                  <ListRow key={conta.id}>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: conta.color }}
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {conta.name}
                        </p>
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
                  </ListRow>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
}
