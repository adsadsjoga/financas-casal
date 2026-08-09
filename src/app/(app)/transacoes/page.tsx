import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { estaForaDoResultado } from "@/lib/constants";
import { resolverPeriodo } from "@/lib/periodo";
import type { Account, Category, Project, Transaction, TxType } from "@/lib/database.types";

import { TransacoesClient } from "./transacoes-client";

export const metadata = { title: "Transações · Finanças do Casal" };

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<{
    modo?: string;
    mes?: string;
    ano?: string;
    dia?: string;
    de?: string;
    ate?: string;
    conta?: string;
    limite?: string;
    categoria?: string;
    pessoa?: string;
    tipo?: string;
    busca?: string;
    editar?: string;
  }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const params = await searchParams;

  const periodo = resolverPeriodo(params);
  const filtroContas = (params.conta ?? "").split(",").filter(Boolean);
  const filtroCategoria = params.categoria ?? "";
  const filtroPessoa = params.pessoa ?? "";
  const filtroTipo = params.tipo === "receita" || params.tipo === "despesa" ? (params.tipo as TxType) : "";
  const busca = (params.busca ?? "").trim();
  const limite = Math.min(Math.max(Number(params.limite ?? 120) || 120, 60), 1000);

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("couple_id", session.couple.id)
    .gte("occurred_on", periodo.de)
    .lt("occurred_on", periodo.ateExclusivo)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range(0, limite);

  let totaisQuery = supabase
    .from("transactions")
    .select("id, type, category_id, amount_primary_cents")
    .eq("couple_id", session.couple.id)
    .in("type", ["receita", "despesa"])
    .gte("occurred_on", periodo.de)
    .lt("occurred_on", periodo.ateExclusivo);

  let descricoesQuery = supabase
    .from("transactions")
    .select("description")
    .eq("couple_id", session.couple.id)
    .not("description", "is", null)
    .gte("occurred_on", periodo.de)
    .lt("occurred_on", periodo.ateExclusivo)
    .order("occurred_on", { ascending: false })
    .range(0, 3000);

  if (filtroContas.length > 0) {
    query = query.in("account_id", filtroContas);
    totaisQuery = totaisQuery.in("account_id", filtroContas);
    descricoesQuery = descricoesQuery.in("account_id", filtroContas);
  }
  if (filtroCategoria) {
    query = query.eq("category_id", filtroCategoria);
    totaisQuery = totaisQuery.eq("category_id", filtroCategoria);
    descricoesQuery = descricoesQuery.eq("category_id", filtroCategoria);
  }
  if (filtroPessoa) {
    query = query.eq("payer_profile_id", filtroPessoa);
    totaisQuery = totaisQuery.eq("payer_profile_id", filtroPessoa);
    descricoesQuery = descricoesQuery.eq("payer_profile_id", filtroPessoa);
  }
  if (filtroTipo) {
    query = query.eq("type", filtroTipo);
    totaisQuery = totaisQuery.eq("type", filtroTipo);
    descricoesQuery = descricoesQuery.eq("type", filtroTipo);
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
    descricoesRes,
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
    descricoesQuery,
  ]);

  // Lançamento aberto pela busca global (`?editar=<id>`) — pode estar fora
  // do período/filtros atuais da tela, por isso é buscado à parte. Se o id
  // não existir ou não for do casal, o `.maybeSingle()` só devolve null.
  const transacaoParaAbrir = params.editar
    ? ((
        await supabase
          .from("transactions")
          .select("*")
          .eq("id", params.editar)
          .eq("couple_id", session.couple.id)
          .maybeSingle()
      ).data as Transaction | null)
    : null;

  const categorias = (categoriasRes.data ?? []) as Category[];
  const categoriasForaDoResultado = new Set(
    categorias.filter((c) => estaForaDoResultado(c.name)).map((c) => c.id),
  );
  const transacoesDeCarros = new Set((linksCarrosRes.data ?? []).map((l) => l.transaction_id));

  // Totais somam só o resultado real: giro entre bolsos próprios e negócio
  // de carros continuam visíveis na lista, mas não inflam entradas/saídas.
  const totaisDoResultado = (totaisRes.data ?? []).filter(
    (t) =>
      !(t.category_id !== null && categoriasForaDoResultado.has(t.category_id)) &&
      !transacoesDeCarros.has(t.id),
  );

  const transacoes = ((transacoesRes.data ?? []) as Transaction[]).slice(0, limite);
  const descricoesVistas = new Set<string>();
  const descricoesBusca = (descricoesRes.data ?? [])
    .map((t) => (t.description ?? "").trim())
    .filter((descricao) => {
      if (!descricao || descricoesVistas.has(descricao)) return false;
      descricoesVistas.add(descricao);
      return true;
    })
    .slice(0, 250);

  // Detalhe de "quem deve quanto" pra cada lançamento dividido — badge
  // "dividida" sozinho não dizia nada além de "está dividida". Busca só as
  // que aparecem na tela (não a tabela inteira).
  const idsDivididas = transacoes.filter((t) => t.split_mode !== "none").map((t) => t.id);
  const splitsRes = idsDivididas.length
    ? await supabase
        .from("transaction_splits")
        .select("transaction_id, profile_id, share_cents")
        .in("transaction_id", idsDivididas)
    : { data: [] };

  const splitsPorTransacao = new Map<string, Array<{ profile_id: string; share_cents: number }>>();
  for (const s of splitsRes.data ?? []) {
    const lista = splitsPorTransacao.get(s.transaction_id) ?? [];
    lista.push({ profile_id: s.profile_id, share_cents: s.share_cents });
    splitsPorTransacao.set(s.transaction_id, lista);
  }

  return (
    <TransacoesClient
      transacoes={transacoes}
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
      periodo={periodo}
      filtroContas={filtroContas}
      filtroCategoria={filtroCategoria}
      filtroPessoa={filtroPessoa}
      filtroTipo={filtroTipo}
      busca={busca}
      descricoesBusca={descricoesBusca}
      moedaCasal={session.couple.primary_currency}
      projetos={(projetosRes.data ?? []) as Project[]}
      vinculosProjetos={vinculosProjetosRes.data ?? []}
      splitsPorTransacao={Object.fromEntries(splitsPorTransacao)}
      transacaoParaAbrir={transacaoParaAbrir}
    />
  );
}
