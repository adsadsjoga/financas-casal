import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseBRL } from "@/lib/money";
import { pertenceAPessoa } from "@/lib/dashboard";
import { estaForaDoResultado } from "@/lib/constants";
import type {
  Account,
  Category,
  InternalTransferLink,
  Transaction,
  TxType,
} from "@/lib/database.types";

import { RevisarClient, type CategoriaResumo } from "./revisar-client";

export const metadata = { title: "Conferencia | Financas do Casal" };

const TIPOS_VALIDOS = new Set<TxType>(["despesa", "receita", "transferencia"]);
const ORDENS_VALIDAS = new Set(["recente", "antigo", "maior", "menor"]);
const ABAS_VALIDAS = new Set(["categorias", "pendentes", "internas"]);

function normalizarCategoria(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function ehTransferenciaInterna(categoria: Category | undefined) {
  return normalizarCategoria(categoria?.name ?? "") === "transferencias internas";
}

export default async function RevisarPage({
  searchParams,
}: {
  searchParams: Promise<{
    aba?: string;
    categoria?: string;
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

  const abaParam = params.aba ?? "";
  const aba = ABAS_VALIDAS.has(abaParam) ? abaParam : "categorias";
  const categoriaSelecionada = params.categoria ?? "";
  const filtroPessoa = params.pessoa ?? "";
  const busca = (params.busca ?? "").trim();
  const valor = (params.valor ?? "").trim();
  const valorCents = valor ? parseBRL(valor) : null;
  const tipoParam = params.tipo ?? "";
  const filtroTipo = TIPOS_VALIDOS.has(tipoParam as TxType) ? (tipoParam as TxType) : "";
  const filtroConta = params.conta ?? "";
  const ordenarParam = params.ordenar ?? "";
  const ordenar = ORDENS_VALIDAS.has(ordenarParam) ? ordenarParam : "recente";

  const [
    contasRes,
    categoriasRes,
    resumoTransacoesRes,
    pendentesBaseRes,
    todasPendentesRes,
    linksInternosRes,
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("couple_id", session.couple.id)
      .order("archived")
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
      .select("id,type,category_id,amount_primary_cents,needs_review,occurred_on")
      .eq("couple_id", session.couple.id)
      .range(0, 50000),
    supabase
      .from("transactions")
      .select("*")
      .eq("couple_id", session.couple.id)
      .eq("needs_review", true)
      .order("occurred_on", { ascending: false })
      .range(0, 500),
    supabase
      .from("transactions")
      .select("id, description, amount_cents")
      .eq("couple_id", session.couple.id)
      .eq("needs_review", true),
    supabase
      .from("internal_transfer_links")
      .select("*")
      .eq("couple_id", session.couple.id)
      .order("created_at", { ascending: false }),
  ]);

  const contas = (contasRes.data ?? []) as Account[];
  const categorias = (categoriasRes.data ?? []) as Category[];
  const categoriasPorId = new Map(categorias.map((c) => [c.id, c]));

  const resumoPorCategoria = new Map<string, CategoriaResumo>();
  for (const categoria of categorias) {
    resumoPorCategoria.set(categoria.id, {
      category_id: categoria.id,
      nome: categoria.name,
      icon: categoria.icon,
      kind: categoria.kind,
      transacoes: 0,
      pendentes: 0,
      receitas_cents: 0,
      despesas_cents: 0,
      saldo_cents: 0,
      ultima_data: null,
      fora_do_resultado: estaForaDoResultado(categoria.name),
      transferencia_interna: ehTransferenciaInterna(categoria),
    });
  }

  for (const t of resumoTransacoesRes.data ?? []) {
    if (!t.category_id) continue;
    const resumo = resumoPorCategoria.get(t.category_id);
    if (!resumo) continue;
    resumo.transacoes += 1;
    if (t.needs_review) resumo.pendentes += 1;
    if (t.type === "receita") resumo.receitas_cents += t.amount_primary_cents;
    if (t.type === "despesa") resumo.despesas_cents += t.amount_primary_cents;
    resumo.saldo_cents = resumo.receitas_cents - resumo.despesas_cents;
    if (!resumo.ultima_data || t.occurred_on > resumo.ultima_data) {
      resumo.ultima_data = t.occurred_on;
    }
  }

  const categoriasResumo = [...resumoPorCategoria.values()].sort((a, b) => {
    if (b.pendentes !== a.pendentes) return b.pendentes - a.pendentes;
    if (b.transacoes !== a.transacoes) return b.transacoes - a.transacoes;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  const idsTransferenciaInterna = categorias.filter(ehTransferenciaInterna).map((c) => c.id);
  const primeiraCategoriaId =
    (aba === "internas" ? idsTransferenciaInterna[0] : "") ||
    categoriasResumo.find((c) => c.pendentes > 0)?.category_id ||
    categoriasResumo.find((c) => c.transacoes > 0)?.category_id ||
    categorias[0]?.id ||
    "";
  const categoriaAtivaId = categoriaSelecionada || primeiraCategoriaId;
  const categoriaAtivaObj = categoriasPorId.get(categoriaAtivaId);

  let queryCategoria = supabase
    .from("transactions")
    .select("*")
    .eq("couple_id", session.couple.id)
    .range(0, 700);

  if (categoriaAtivaId) {
    if (ehTransferenciaInterna(categoriaAtivaObj) && idsTransferenciaInterna.length > 0) {
      queryCategoria = queryCategoria.in("category_id", idsTransferenciaInterna);
    } else {
      queryCategoria = queryCategoria.eq("category_id", categoriaAtivaId);
    }
  }
  if (busca) queryCategoria = queryCategoria.ilike("description", `%${busca}%`);
  if (valorCents !== null) queryCategoria = queryCategoria.eq("amount_cents", Math.abs(valorCents));
  if (filtroTipo) queryCategoria = queryCategoria.eq("type", filtroTipo);
  if (filtroConta) queryCategoria = queryCategoria.eq("account_id", filtroConta);

  if (ordenar === "antigo") queryCategoria = queryCategoria.order("occurred_on", { ascending: true });
  else if (ordenar === "maior") queryCategoria = queryCategoria.order("amount_primary_cents", { ascending: false });
  else if (ordenar === "menor") queryCategoria = queryCategoria.order("amount_primary_cents", { ascending: true });
  else queryCategoria = queryCategoria.order("occurred_on", { ascending: false });

  const categoriaTransacoesRes = categoriaAtivaId
    ? await queryCategoria
    : { data: [] };

  const donoPorConta = new Map(contas.map((c) => [c.id, c.owner_profile_id]));
  const pendentesBrutas = (pendentesBaseRes.data ?? []) as Transaction[];
  const pendentes = filtroPessoa
    ? pendentesBrutas.filter((t) => pertenceAPessoa(t, filtroPessoa, donoPorConta))
    : pendentesBrutas;

  const categoriaTransacoesBrutas = (categoriaTransacoesRes.data ?? []) as Transaction[];
  const categoriaTransacoes = filtroPessoa
    ? categoriaTransacoesBrutas.filter((t) => pertenceAPessoa(t, filtroPessoa, donoPorConta))
    : categoriaTransacoesBrutas;

  return (
    <RevisarClient
      aba={aba}
      categoriaAtivaId={categoriaAtivaId}
      categoriaAtiva={categoriaAtivaObj ?? null}
      categoriasResumo={categoriasResumo}
      categoriaTransacoes={categoriaTransacoes}
      transacoes={pendentes}
      todasPendentes={
        (todasPendentesRes.data ?? []) as Array<{
          id: string;
          description: string | null;
          amount_cents: number;
        }>
      }
      linksInternos={(linksInternosRes.data ?? []) as InternalTransferLink[]}
      contas={contas}
      categorias={categorias}
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
