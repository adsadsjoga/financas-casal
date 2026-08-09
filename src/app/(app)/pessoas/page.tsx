import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { acharContraparte, agregarFluxoPorPessoa, type TransacaoDetalhada } from "@/lib/pessoas";
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

  // Paginado de propósito: o PostgREST corta em `db-max-rows` (1000) sem
  // avisar — sem isso os totais de Pessoas ficam calculados sobre um
  // subconjunto arbitrário do extrato. Mesmo helper de
  // `transacoes/actions.ts` (exportarTransacoesCsv).
  const PAGINA = 1000;
  const paginaDeTransacoes = (de: number) => {
    let q = supabase
      .from("transactions")
      .select("id, type, description, amount_primary_cents, occurred_on, category_id, account_id")
      .eq("couple_id", session.couple.id)
      .in("type", ["receita", "despesa"])
      .lt("occurred_on", proximoMes)
      .order("occurred_on", { ascending: true })
      .range(de, de + PAGINA - 1);

    if (desde) q = q.gte("occurred_on", desde);
    return q;
  };

  const [primeiraPagina, contrapartesRes, aliasesRes, categoriasRes, contasRes] =
    await Promise.all([
      paginaDeTransacoes(0),
      supabase
        .from("counterparties")
        .select("*")
        .eq("couple_id", session.couple.id),
      supabase.from("counterparty_aliases").select("id, counterparty_id, pattern"),
      supabase
        .from("categories")
        .select("id, name, icon")
        .eq("couple_id", session.couple.id),
      supabase
        .from("accounts")
        .select("id, name")
        .eq("couple_id", session.couple.id),
    ]);

  const transacoesDetalhadas = (primeiraPagina.data ?? []) as TransacaoDetalhada[];
  while (transacoesDetalhadas.length % PAGINA === 0 && transacoesDetalhadas.length > 0) {
    const proxima = await paginaDeTransacoes(transacoesDetalhadas.length);
    const linhas = (proxima.data ?? []) as TransacaoDetalhada[];
    if (linhas.length === 0) break;
    transacoesDetalhadas.push(...linhas);
  }

  const contrapartes = (contrapartesRes.data ?? []) as Counterparty[];
  const aliases = (aliasesRes.data ?? []) as Pick<
    CounterpartyAlias,
    "id" | "counterparty_id" | "pattern"
  >[];

  const fluxosComMovimento = agregarFluxoPorPessoa(transacoesDetalhadas, contrapartes, aliases);
  const fluxosPorId = new Map(fluxosComMovimento.map((f) => [f.counterpartyId, f]));
  const fluxos = contrapartes
    .map(
      (c) =>
        fluxosPorId.get(c.id) ?? {
          counterpartyId: c.id,
          nome: c.name,
          kind: c.kind,
          archived: c.archived,
          totalRecebido: 0,
          totalEnviado: 0,
          liquido: 0,
          numTransacoes: 0,
          primeiraTransacao: "",
          ultimaTransacao: "",
        },
    )
    .sort(
      (a, b) =>
        b.totalRecebido +
          b.totalEnviado -
          (a.totalRecebido + a.totalEnviado) ||
        a.nome.localeCompare(b.nome),
    );
  const transacoesSemContraparte = transacoesDetalhadas
    .filter((t) => acharContraparte(t.description, aliases) === null)
    .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));

  return (
    <PessoasClient
      fluxos={fluxos}
      contrapartes={contrapartes.map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.kind,
        archived: c.archived,
      }))}
      aliases={aliases}
      transacoesSemContraparte={transacoesSemContraparte}
      categorias={(categoriasRes.data ?? []) as Array<{ id: string; name: string; icon: string }>}
      contas={(contasRes.data ?? []) as Array<{ id: string; name: string }>}
      periodo={periodo}
      periodoDesde={desde}
      periodoAte={proximoMes}
      moeda={session.couple.primary_currency}
      totalCadastradas={contrapartes.length}
    />
  );
}
