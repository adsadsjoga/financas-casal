import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseBRL } from "@/lib/money";
import { pertenceAPessoa } from "@/lib/dashboard";
import type { Account, Category, Transaction, TxType } from "@/lib/database.types";

const TIPOS_VALIDOS = new Set<TxType>(["despesa", "receita", "transferencia"]);

const ORDENS_VALIDAS = new Set(["recente", "antigo", "maior", "menor"]);

import { RevisarClient } from "./revisar-client";

export const metadata = { title: "Revisar · Finanças do Casal" };

export default async function RevisarPage({
  searchParams,
}: {
  searchParams: Promise<{
    pessoa?: string;
    busca?: string;
    valor?: string;
    tipo?: string;
    conta?: string;
    ordenar?: string;
  }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const params = await searchParams;

  const filtroPessoa = params.pessoa ?? "";
  const busca = (params.busca ?? "").trim();
  const valor = (params.valor ?? "").trim();
  const valorCents = valor ? parseBRL(valor) : null;
  const tipoParam = params.tipo ?? "";
  const filtroTipo = TIPOS_VALIDOS.has(tipoParam as TxType) ? (tipoParam as TxType) : "";
  const filtroConta = params.conta ?? "";
  const ordenarParam = params.ordenar ?? "";
  const ordenar = ORDENS_VALIDAS.has(ordenarParam) ? ordenarParam : "recente";

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("couple_id", session.couple.id)
    .eq("needs_review", true);

  if (ordenar === "antigo") query = query.order("occurred_on", { ascending: true });
  else if (ordenar === "maior") query = query.order("amount_cents", { ascending: false });
  else if (ordenar === "menor") query = query.order("amount_cents", { ascending: true });
  else query = query.order("occurred_on", { ascending: false });

  if (busca) query = query.ilike("description", `%${busca}%`);
  if (valorCents !== null) query = query.eq("amount_cents", Math.abs(valorCents));
  if (filtroTipo) query = query.eq("type", filtroTipo);
  if (filtroConta) query = query.eq("account_id", filtroConta);

  const [transacoesRes, contasRes, categoriasRes, todasPendentesRes] = await Promise.all([
    query,
    supabase
      .from("accounts")
      .select("*")
      .eq("couple_id", session.couple.id)
      .order("created_at"),
    supabase
      .from("categories")
      .select("*")
      .eq("couple_id", session.couple.id)
      .eq("archived", false)
      .order("kind")
      .order("name"),
    supabase
      .from("transactions")
      .select("id, description, amount_cents")
      .eq("couple_id", session.couple.id)
      .eq("needs_review", true),
  ]);

  // Filtro de pessoa por payer_profile_id direto perdia receita sem esse
  // campo preenchido (comum em importação) mesmo pertencendo à conta da
  // pessoa — mesma regra de `pertenceAPessoa` já usada na Home/Dashboard,
  // pra o link "N lançamentos para revisar" da Home bater com o que aparece
  // aqui ao clicar.
  const contas = (contasRes.data ?? []) as Account[];
  const donoPorConta = new Map(contas.map((c) => [c.id, c.owner_profile_id]));
  const transacoesBrutas = (transacoesRes.data ?? []) as Transaction[];
  const transacoes = filtroPessoa
    ? transacoesBrutas.filter((t) => pertenceAPessoa(t, filtroPessoa, donoPorConta))
    : transacoesBrutas;

  return (
    <RevisarClient
      transacoes={transacoes}
      todasPendentes={
        (todasPendentesRes.data ?? []) as Array<{
          id: string;
          description: string | null;
          amount_cents: number;
        }>
      }
      contas={contas}
      categorias={(categoriasRes.data ?? []) as Category[]}
      membros={session.members.map((m) => ({
        profile_id: m.profile_id,
        profile: m.profile,
      }))}
      filtroPessoa={filtroPessoa}
      busca={busca}
      valor={valor}
      filtroTipo={filtroTipo}
      filtroConta={filtroConta}
      ordenar={ordenar}
      moedaCasal={session.couple.primary_currency}
    />
  );
}
