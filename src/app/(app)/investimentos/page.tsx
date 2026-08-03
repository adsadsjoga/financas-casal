import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  agregarPosicoesPorAtivo,
  aplicarValorDeMercado,
  TIPOS_NEGOCIAVEIS_B3,
} from "@/lib/investimentos";
import { buscarPrecosB3 } from "@/lib/precos-mercado";
import { obterCotacao } from "@/lib/fx";
import { hojeISO } from "@/lib/dates";
import { CATEGORIA_INVESTIMENTOS } from "@/lib/constants";
import type { InvestmentHolding } from "@/lib/database.types";

import { InvestimentosClient } from "./investimentos-client";

export const metadata = { title: "Investimentos · Finanças do Casal" };

export default async function InvestimentosPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categories")
    .select("id")
    .eq("couple_id", session.couple.id)
    .eq("name", CATEGORIA_INVESTIMENTOS);

  const idsCategoria = (categorias ?? []).map((c) => c.id);

  const [transacoesRes, holdingsRes] = await Promise.all([
    idsCategoria.length
      ? supabase
          .from("transactions")
          .select("type, description, amount_primary_cents")
          .eq("couple_id", session.couple.id)
          .in("category_id", idsCategoria)
      : Promise.resolve({ data: [] as Array<{ type: string; description: string; amount_primary_cents: number }> }),
    supabase.from("investment_holdings").select("*").eq("couple_id", session.couple.id),
  ]);

  const posicoesBase = agregarPosicoesPorAtivo(transacoesRes.data ?? []);
  const holdings = (holdingsRes.data ?? []) as InvestmentHolding[];
  const quantidades = new Map(holdings.map((h) => [h.ticker, h.quantity]));

  const tickersNegociaveis = posicoesBase
    .filter((p) => TIPOS_NEGOCIAVEIS_B3.has(p.tipo))
    .map((p) => p.ativo);

  const moeda = session.couple.primary_currency;

  // Preço vem em BRL; se a moeda do casal já for BRL a taxa é 1 (obterCotacao
  // já trata base===quote assim), senão busca a cotação de hoje — valor de
  // mercado é "agora", não faz sentido congelar como as transações fazem.
  const [precos, cotacao] = await Promise.all([
    buscarPrecosB3(tickersNegociaveis),
    obterCotacao("BRL", moeda, hojeISO()),
  ]);

  const posicoes = aplicarValorDeMercado(posicoesBase, quantidades, precos, cotacao.rate);

  return <InvestimentosClient posicoes={posicoes} moeda={moeda} />;
}
