import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { agregarFluxoPorPessoa } from "@/lib/pessoas";
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
    .select("type, description, amount_primary_cents, occurred_on")
    .eq("couple_id", session.couple.id)
    .in("type", ["receita", "despesa"])
    .lt("occurred_on", proximoMes);

  if (desde) transacoesQuery = transacoesQuery.gte("occurred_on", desde);

  const [transacoesRes, contrapartesRes, aliasesRes] = await Promise.all([
    transacoesQuery,
    supabase
      .from("counterparties")
      .select("*")
      .eq("couple_id", session.couple.id)
      .eq("archived", false),
    supabase.from("counterparty_aliases").select("counterparty_id, pattern"),
  ]);

  const contrapartes = (contrapartesRes.data ?? []) as Counterparty[];
  const aliases = (aliasesRes.data ?? []) as Pick<
    CounterpartyAlias,
    "counterparty_id" | "pattern"
  >[];

  const fluxos = agregarFluxoPorPessoa(
    transacoesRes.data ?? [],
    contrapartes.map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
    aliases,
  );

  return (
    <PessoasClient
      fluxos={fluxos}
      periodo={periodo}
      moeda={session.couple.primary_currency}
      totalCadastradas={contrapartes.length}
    />
  );
}
