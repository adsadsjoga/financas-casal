import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  agregarAlocacaoPorTipo,
  agregarAporteAcumuladoMensal,
  agregarPosicoesPorAtivo,
  aplicarValorDeMercado,
  destaquesRentabilidade,
  TIPOS_NEGOCIAVEIS_B3,
} from "@/lib/investimentos";
import { buscarPrecosB3 } from "@/lib/precos-mercado";
import { obterCotacao } from "@/lib/fx";
import { hojeISO, primeiroDiaDoMes } from "@/lib/dates";
import { CATEGORIA_INVESTIMENTOS } from "@/lib/constants";
import type { InvestmentHolding } from "@/lib/database.types";

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

  let transacoesQuery = idsCategoria.length
    ? supabase
        .from("transactions")
        .select("type, description, amount_primary_cents, occurred_on")
        .eq("couple_id", session.couple.id)
        .in("category_id", idsCategoria)
    : null;
  if (transacoesQuery && pessoaDaVisao) {
    transacoesQuery = transacoesQuery.eq("payer_profile_id", pessoaDaVisao);
  }

  const [transacoesRes, holdingsRes] = await Promise.all([
    transacoesQuery ??
      Promise.resolve({
        data: [] as Array<{
          type: string;
          description: string;
          amount_primary_cents: number;
          occurred_on: string;
        }>,
      }),
    supabase.from("investment_holdings").select("*").eq("couple_id", session.couple.id),
  ]);

  const transacoes = transacoesRes.data ?? [];
  const posicoesBase = agregarPosicoesPorAtivo(transacoes);
  const holdings = (holdingsRes.data ?? []) as InvestmentHolding[];
  // Posições (quantidade de cotas/ações) são do casal, não têm dono único —
  // mesma regra da conta conjunta na home: na visão individual, não dá para
  // inventar de quem é cada cota, então valor de mercado só aparece na
  // visão Casal.
  const quantidades = pessoaDaVisao
    ? new Map<string, number>()
    : new Map(holdings.map((h) => [h.ticker, h.quantity]));

  const tickersNegociaveis = pessoaDaVisao
    ? []
    : posicoesBase.filter((p) => TIPOS_NEGOCIAVEIS_B3.has(p.tipo)).map((p) => p.ativo);

  const moeda = session.couple.primary_currency;

  // Preço vem em BRL; se a moeda do casal já for BRL a taxa é 1 (obterCotacao
  // já trata base===quote assim), senão busca a cotação de hoje — valor de
  // mercado é "agora", não faz sentido congelar como as transações fazem.
  const [precos, cotacao] = await Promise.all([
    buscarPrecosB3(tickersNegociaveis),
    obterCotacao("BRL", moeda, hojeISO()),
  ]);

  const posicoes = aplicarValorDeMercado(posicoesBase, quantidades, precos, cotacao.rate);
  const alocacaoPorTipo = agregarAlocacaoPorTipo(posicoes);
  const destaques = destaquesRentabilidade(posicoes);
  const aporteAcumulado = agregarAporteAcumuladoMensal(transacoes, primeiroDiaDoMes(hojeISO()), 12);

  return (
    <InvestimentosClient
      posicoes={posicoes}
      moeda={moeda}
      alocacaoPorTipo={alocacaoPorTipo}
      destaques={destaques}
      aporteAcumulado={aporteAcumulado}
      opcoesVisao={opcoesVisao}
      visao={visao}
      individual={pessoaDaVisao !== null}
    />
  );
}
