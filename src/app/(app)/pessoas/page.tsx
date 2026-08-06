import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { agregarFluxoPorPessoa, type TransacaoDetalhada } from "@/lib/pessoas";
import { addMeses, hojeISO, inicioDoMesSeguinte, primeiroDiaDoMes } from "@/lib/dates";
import type { Counterparty, CounterpartyAlias } from "@/lib/database.types";

import { PessoasClient } from "./pessoas-client";

export const metadata = { title: "Pessoas · Finanças do Casal" };

/** Janelas de tempo que a tela oferece, em meses para trás. `0` = tudo. */
const PERIODOS: Record<string, number> = { "3m": 3, "6m": 6, "12m": 12, tudo: 0 };

export default async function PessoasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const params = await searchParams;

  const periodo = Object.hasOwn(PERIODOS, params.periodo ?? "") ? params.periodo! : "12m";
  const meses = PERIODOS[periodo];

  const hoje = hojeISO();
  const proximoMes = inicioDoMesSeguinte(primeiroDiaDoMes(hoje));
  const desde = meses > 0 ? addMeses(primeiroDiaDoMes(hoje), -(meses - 1)) : null;

  let transacoesQuery = supabase
    .from("transactions")
    .select("id, type, description, amount_primary_cents, occurred_on, category_id, account_id")
    .eq("couple_id", session.couple.id)
    .in("type", ["receita", "despesa"])
    .lt("occurred_on", proximoMes);

  if (desde) transacoesQuery = transacoesQuery.gte("occurred_on", desde);

  const [transacoesRes, contrapartesRes, aliasesRes, categoriasRes, contasRes] =
    await Promise.all([
      transacoesQuery,
      supabase
        .from("counterparties")
        .select("*")
        .eq("couple_id", session.couple.id),
      supabase.from("counterparty_aliases").select("counterparty_id, pattern"),
      supabase
        .from("categories")
        .select("id, name, icon")
        .eq("couple_id", session.couple.id),
      supabase
        .from("accounts")
        .select("id, name")
        .eq("couple_id", session.couple.id),
    ]);

  const contrapartes = (contrapartesRes.data ?? []) as Counterparty[];
  const aliases = (aliasesRes.data ?? []) as Pick<
    CounterpartyAlias,
    "counterparty_id" | "pattern"
  >[];
  const transacoesDetalhadas = (transacoesRes.data ?? []) as TransacaoDetalhada[];

  const fluxos = agregarFluxoPorPessoa(transacoesDetalhadas, contrapartes, aliases);

  return (
    <PessoasClient
      fluxos={fluxos}
      transacoes={transacoesDetalhadas}
      aliases={aliases}
      categorias={(categoriasRes.data ?? []) as Array<{ id: string; name: string; icon: string }>}
      contas={(contasRes.data ?? []) as Array<{ id: string; name: string }>}
      periodo={periodo}
      moeda={session.couple.primary_currency}
      totalCadastradas={contrapartes.length}
    />
  );
}
