import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { pertenceAPessoa } from "@/lib/dashboard";
import {
  agregarAlocacaoPorTipo,
  agregarAporteAcumuladoMensal,
  agregarAporteMensal,
  agregarDividendosMensal,
  agregarEvolucaoPatrimonial,
  agregarPosicoesPorAtivo,
  aplicarValorDeMercado,
  destaquesRentabilidade,
  TIPOS_NEGOCIAVEIS_B3,
} from "@/lib/investimentos";
import { buscarPrecosB3 } from "@/lib/precos-mercado";
import { obterCotacao } from "@/lib/fx";
import { addMeses, hojeISO, primeiroDiaDoMes } from "@/lib/dates";
import { CATEGORIA_INVESTIMENTOS } from "@/lib/constants";
import type { AccountBalance, InvestmentDividend, InvestmentHolding } from "@/lib/database.types";

import { InvestimentosClient } from "./investimentos-client";

export const metadata = { title: "Investimentos · Finanças do Casal" };

export default async function InvestimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const params = await searchParams;

  // Mesma regra da home: visão individual só existe com parceiro cadastrado,
  // e abrir sem `?visao=` explícito começa na visão da própria pessoa.
  const visoesValidas = session.partner
    ? ["casal", session.me.profile_id, session.partner.profile_id]
    : ["casal"];
  const visaoPadrao = session.partner ? session.me.profile_id : "casal";
  const visao = visoesValidas.includes(params.visao ?? "") ? params.visao! : visaoPadrao;
  const pessoaDaVisao = visao === "casal" ? null : visao;

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

  const { data: categorias } = await supabase
    .from("categories")
    .select("id")
    .eq("couple_id", session.couple.id)
    .eq("name", CATEGORIA_INVESTIMENTOS);

  const idsCategoria = (categorias ?? []).map((c) => c.id);
  const hoje = hojeISO();
  const mesAtual = primeiroDiaDoMes(hoje);
  // Evolução patrimonial/dividendos só fazem sentido na visão Casal — cota
  // e patrimônio total não têm dono único (mesma regra de sempre nesta
  // página); não busca esses dados extras na visão individual.
  const inicioJanela12Meses = addMeses(mesAtual, -11);

  // account_id entra na seleção pra achar o dono de receitas sem
  // payer_profile_id (mesma regra da Home) — o filtro de pessoa não pode
  // mais ser feito só no banco.
  const transacoesQuery = idsCategoria.length
    ? supabase
        .from("transactions")
        .select("type, description, amount_primary_cents, occurred_on, account_id, payer_profile_id")
        .eq("couple_id", session.couple.id)
        .in("category_id", idsCategoria)
    : null;

  const [transacoesRes, holdingsRes, todasContasRes, dividendosRes, saldosRes, patrimonioTransacoesRes] =
    await Promise.all([
      transacoesQuery ??
        Promise.resolve({
          data: [] as Array<{
            type: string;
            description: string;
            amount_primary_cents: number;
            occurred_on: string;
            account_id: string;
            payer_profile_id: string | null;
          }>,
        }),
      supabase.from("investment_holdings").select("*").eq("couple_id", session.couple.id),
      supabase.from("accounts").select("id, owner_profile_id").eq("couple_id", session.couple.id),
      supabase.from("investment_dividends").select("*").eq("couple_id", session.couple.id),
      pessoaDaVisao
        ? Promise.resolve({ data: [] as AccountBalance[] })
        : supabase.from("account_balances").select("*").eq("couple_id", session.couple.id),
      pessoaDaVisao
        ? Promise.resolve({ data: [] as Array<{ type: string; occurred_on: string; amount_primary_cents: number }> })
        : supabase
            .from("transactions")
            .select("type, occurred_on, amount_primary_cents")
            .eq("couple_id", session.couple.id)
            .in("type", ["receita", "despesa"])
            .gte("occurred_on", inicioJanela12Meses),
    ]);

  let transacoes = transacoesRes.data ?? [];
  const donoPorConta = new Map(
    (todasContasRes.data ?? []).map((c) => [c.id, c.owner_profile_id as string | null]),
  );
  if (pessoaDaVisao) {
    transacoes = transacoes.filter((t) => pertenceAPessoa(t, pessoaDaVisao, donoPorConta));
  }

  const holdings = (holdingsRes.data ?? []) as InvestmentHolding[];
  const tickersArquivados = new Set(holdings.filter((h) => h.archived).map((h) => h.ticker));

  const posicoesBase = agregarPosicoesPorAtivo(transacoes).filter(
    (p) => !tickersArquivados.has(p.ativo),
  );
  // Posições (quantidade de cotas/ações) são do casal, não têm dono único —
  // mesma regra da conta conjunta na home: na visão individual, não dá para
  // inventar de quem é cada cota, então valor de mercado só aparece na
  // visão Casal.
  const quantidades = pessoaDaVisao
    ? new Map<string, number>()
    : new Map(holdings.map((h) => [h.ticker, h.quantity]));
  const precosMedios = pessoaDaVisao
    ? new Map<string, number>()
    : new Map(
        holdings
          .filter((h) => h.avg_price_cents !== null)
          .map((h) => [h.ticker, h.avg_price_cents as number]),
      );

  const tickersNegociaveis = pessoaDaVisao
    ? []
    : posicoesBase.filter((p) => TIPOS_NEGOCIAVEIS_B3.has(p.tipo)).map((p) => p.ativo);

  const moeda = session.couple.primary_currency;

  // Preço vem em BRL; se a moeda do casal já for BRL a taxa é 1 (obterCotacao
  // já trata base===quote assim), senão busca a cotação de hoje — valor de
  // mercado é "agora", não faz sentido congelar como as transações fazem.
  const [precos, cotacao] = await Promise.all([
    buscarPrecosB3(tickersNegociaveis),
    obterCotacao("BRL", moeda, hoje),
  ]);

  const posicoes = aplicarValorDeMercado(posicoesBase, quantidades, precos, cotacao.rate, precosMedios);
  const alocacaoPorTipo = agregarAlocacaoPorTipo(posicoes);
  const destaques = destaquesRentabilidade(posicoes);
  const aporteAcumulado = agregarAporteAcumuladoMensal(transacoes, mesAtual, 12);
  const aporteMensal = agregarAporteMensal(transacoes, mesAtual, 12);

  const dividendosTodos = (dividendosRes.data ?? []) as InvestmentDividend[];
  const dividendosMensal = agregarDividendosMensal(dividendosTodos, mesAtual, 12);

  const patrimonioAtual = (saldosRes.data ?? []).reduce(
    (acc, s) => acc + (s as AccountBalance).balance_primary_cents,
    0,
  );
  const evolucaoPatrimonial = pessoaDaVisao
    ? []
    : agregarEvolucaoPatrimonial(patrimonioAtual, patrimonioTransacoesRes.data ?? [], mesAtual, 12);

  return (
    <InvestimentosClient
      posicoes={posicoes}
      moeda={moeda}
      alocacaoPorTipo={alocacaoPorTipo}
      destaques={destaques}
      aporteAcumulado={aporteAcumulado}
      aporteMensal={aporteMensal}
      evolucaoPatrimonial={evolucaoPatrimonial}
      dividendosMensal={dividendosMensal}
      dividendos={dividendosTodos}
      transacoesInvestimentos={transacoes}
      opcoesVisao={opcoesVisao}
      visao={visao}
      individual={pessoaDaVisao !== null}
      holdings={holdings}
    />
  );
}
