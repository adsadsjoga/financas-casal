import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { agregarPosicoesPorAtivo } from "@/lib/investimentos";
import { CATEGORIA_INVESTIMENTOS } from "@/lib/constants";

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

  const { data: transacoes } = idsCategoria.length
    ? await supabase
        .from("transactions")
        .select("type, description, amount_primary_cents")
        .eq("couple_id", session.couple.id)
        .in("category_id", idsCategoria)
    : { data: [] as Array<{ type: string; description: string; amount_primary_cents: number }> };

  const posicoes = agregarPosicoesPorAtivo(transacoes ?? []);

  return <InvestimentosClient posicoes={posicoes} moeda={session.couple.primary_currency} />;
}
