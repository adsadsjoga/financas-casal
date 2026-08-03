import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hojeISO, inicioDoMesSeguinte, primeiroDiaDoMes } from "@/lib/dates";
import type { Budget, Category } from "@/lib/database.types";

import { OrcamentosClient } from "./orcamentos-client";

export const metadata = { title: "Orçamentos · Finanças do Casal" };

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const params = await searchParams;

  const mes = /^\d{4}-\d{2}-\d{2}$/.test(params.mes ?? "")
    ? primeiroDiaDoMes(params.mes!)
    : primeiroDiaDoMes(hojeISO());
  const proximoMes = inicioDoMesSeguinte(mes);

  const [orcamentosRes, categoriasRes, transacoesRes, linksCarrosRes] = await Promise.all([
    supabase
      .from("budgets")
      .select("*")
      .eq("couple_id", session.couple.id)
      .eq("month", mes),
    supabase
      .from("categories")
      .select("*")
      .eq("couple_id", session.couple.id)
      .eq("kind", "despesa")
      .eq("archived", false)
      .order("name"),
    supabase
      .from("transactions")
      .select("id, type, category_id, payer_profile_id, amount_primary_cents")
      .eq("couple_id", session.couple.id)
      .eq("type", "despesa")
      .gte("occurred_on", mes)
      .lt("occurred_on", proximoMes),
    supabase
      .from("vehicle_transaction_links")
      .select("transaction_id")
      .eq("couple_id", session.couple.id),
  ]);

  const transacoesDeCarros = new Set((linksCarrosRes.data ?? []).map((l) => l.transaction_id));
  const transacoesDoMes = (transacoesRes.data ?? []).filter((t) => !transacoesDeCarros.has(t.id));

  return (
    <OrcamentosClient
      mes={mes}
      orcamentos={(orcamentosRes.data ?? []) as Budget[]}
      categorias={(categoriasRes.data ?? []) as Category[]}
      transacoesDoMes={transacoesDoMes}
      membros={session.members.map((m) => ({
        profile_id: m.profile_id,
        profile: m.profile,
      }))}
      moedaCasal={session.couple.primary_currency}
    />
  );
}
