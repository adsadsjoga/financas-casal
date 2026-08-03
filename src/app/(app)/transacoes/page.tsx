import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hojeISO, inicioDoMesSeguinte, primeiroDiaDoMes } from "@/lib/dates";
import { CATEGORIAS_FORA_DO_RESULTADO } from "@/lib/constants";
import type { Account, Category, Project, Transaction } from "@/lib/database.types";

import { TransacoesClient } from "./transacoes-client";

export const metadata = { title: "Transações · Finanças do Casal" };

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    mes?: string;
    conta?: string;
    limite?: string;
    categoria?: string;
    pessoa?: string;
    busca?: string;
  }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const params = await searchParams;

  const mes = /^\d{4}-\d{2}-\d{2}$/.test(params.mes ?? "")
    ? primeiroDiaDoMes(params.mes!)
    : primeiroDiaDoMes(hojeISO());
  const proximoMes = inicioDoMesSeguinte(mes);
  const filtroConta = params.conta ?? "";
  const filtroCategoria = params.categoria ?? "";
  const filtroPessoa = params.pessoa ?? "";
  const busca = (params.busca ?? "").trim();
  const limite = Math.min(Math.max(Number(params.limite ?? 120) || 120, 60), 1000);

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("couple_id", session.couple.id)
    .gte("occurred_on", mes)
    .lt("occurred_on", proximoMes)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range(0, limite);

  let totaisQuery = supabase
    .from("transactions")
    .select("id, type, category_id, amount_primary_cents")
    .eq("couple_id", session.couple.id)
    .in("type", ["receita", "despesa"])
    .gte("occurred_on", mes)
    .lt("occurred_on", proximoMes);

  if (filtroConta) {
    query = query.eq("account_id", filtroConta);
    totaisQuery = totaisQuery.eq("account_id", filtroConta);
  }
  if (filtroCategoria) {
    query = query.eq("category_id", filtroCategoria);
    totaisQuery = totaisQuery.eq("category_id", filtroCategoria);
  }
  if (filtroPessoa) {
    query = query.eq("payer_profile_id", filtroPessoa);
    totaisQuery = totaisQuery.eq("payer_profile_id", filtroPessoa);
  }
  if (busca) {
    query = query.ilike("description", `%${busca}%`);
    totaisQuery = totaisQuery.ilike("description", `%${busca}%`);
  }

  const [
    transacoesRes,
    totaisRes,
    contasRes,
    categoriasRes,
    linksCarrosRes,
    projetosRes,
    vinculosProjetosRes,
  ] = await Promise.all([
    query,
    totaisQuery,
    supabase
      .from("accounts")
      .select("*")
      .eq("couple_id", session.couple.id)
      .eq("archived", false)
      .order("created_at"),
    supabase
      .from("categories")
      .select("*")
      .eq("couple_id", session.couple.id)
      .eq("archived", false)
      .order("kind")
      .order("name"),
    supabase
      .from("vehicle_transaction_links")
      .select("transaction_id")
      .eq("couple_id", session.couple.id),
    supabase
      .from("projects")
      .select("*")
      .eq("couple_id", session.couple.id)
      .eq("archived", false)
      .order("name"),
    supabase.from("project_transactions").select("project_id, transaction_id"),
  ]);

  const categorias = (categoriasRes.data ?? []) as Category[];
  const categoriasForaDoResultado = new Set(
    categorias.filter((c) => CATEGORIAS_FORA_DO_RESULTADO.includes(c.name)).map((c) => c.id),
  );
  const transacoesDeCarros = new Set((linksCarrosRes.data ?? []).map((l) => l.transaction_id));

  // Totais somam só o resultado real: giro entre bolsos próprios e negócio
  // de carros continuam visíveis na lista, mas não inflam entradas/saídas.
  const totaisDoResultado = (totaisRes.data ?? []).filter(
    (t) =>
      !(t.category_id !== null && categoriasForaDoResultado.has(t.category_id)) &&
      !transacoesDeCarros.has(t.id),
  );

  return (
    <TransacoesClient
      transacoes={((transacoesRes.data ?? []) as Transaction[]).slice(0, limite)}
      temMais={(transacoesRes.data ?? []).length > limite}
      limite={limite}
      totaisMes={totaisDoResultado}
      contas={(contasRes.data ?? []) as Account[]}
      categorias={categorias}
      membros={session.members.map((m) => ({
        profile_id: m.profile_id,
        income_cents: m.income_cents,
        profile: m.profile,
      }))}
      usuarioId={session.userId}
      mes={mes}
      filtroConta={filtroConta}
      filtroCategoria={filtroCategoria}
      filtroPessoa={filtroPessoa}
      busca={busca}
      moedaCasal={session.couple.primary_currency}
      projetos={(projetosRes.data ?? []) as Project[]}
      vinculosProjetos={vinculosProjetosRes.data ?? []}
    />
  );
}
