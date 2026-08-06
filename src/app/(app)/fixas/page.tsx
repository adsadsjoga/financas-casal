import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addMeses, hojeISO, inicioDoMesSeguinte, primeiroDiaDoMes } from "@/lib/dates";
import { agregarDespesasPorCategoria, pertenceAPessoa } from "@/lib/dashboard";
import type { Account, AccountBalance, Category, Recurrence } from "@/lib/database.types";

import { FixasClient } from "./fixas-client";

export const metadata = { title: "Contas fixas · Finanças do Casal" };

export default async function FixasPage({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const params = await searchParams;

  const hoje = hojeISO();
  const mesAtual = primeiroDiaDoMes(hoje);
  const proximoMes = inicioDoMesSeguinte(mesAtual);
  // Janela de 3 meses pra análise de custo fixo — recorrência varia de valor
  // mês a mês (luz, água), 1 mês só não mostra um padrão de verdade.
  const inicioAnalise = addMeses(mesAtual, -2);

  // Mesma regra da Home: visão individual só existe com parceiro cadastrado,
  // e abrir sem `?visao=` explícito começa na visão da própria pessoa.
  const visoesValidas = session.partner
    ? ["casal", session.me.profile_id, session.partner.profile_id]
    : ["casal"];
  const visaoPadrao = session.partner ? session.me.profile_id : "casal";
  const visao = visoesValidas.includes(params.visao ?? "") ? params.visao! : visaoPadrao;
  const pessoaDaVisao = visao === "casal" ? null : visao;

  const opcoesVisao = session.partner
    ? [
        { valor: "casal", rotulo: "Casal", icone: "👥" },
        {
          valor: session.me.profile_id,
          rotulo: session.profile.display_name.split(" ")[0],
          icone: session.profile.avatar_emoji,
        },
        {
          valor: session.partner.profile_id,
          rotulo: session.partner.profile.display_name.split(" ")[0],
          icone: session.partner.profile.avatar_emoji,
        },
      ]
    : [];

  const [
    recorrenciasRes,
    saldosRes,
    contasRes,
    categoriasRes,
    lancadasRes,
    analiseRes,
    contrapartesRes,
  ] = await Promise.all([
    supabase
      .from("recurrences")
      .select("*")
      .eq("couple_id", session.couple.id)
      .order("day_of_month"),
    supabase.from("account_balances").select("*").eq("couple_id", session.couple.id),
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
      .from("transactions")
      .select("recurrence_id")
      .eq("couple_id", session.couple.id)
      .not("recurrence_id", "is", null)
      .gte("occurred_on", mesAtual)
      .lt("occurred_on", proximoMes),
    // Só o que já nasceu de uma recorrência — despesa avulsa não é "custo
    // fixo", mesmo que caia numa categoria parecida.
    supabase
      .from("transactions")
      .select("type, category_id, account_id, payer_profile_id, amount_primary_cents")
      .eq("couple_id", session.couple.id)
      .eq("type", "despesa")
      .not("recurrence_id", "is", null)
      .gte("occurred_on", inicioAnalise)
      .lt("occurred_on", proximoMes),
    supabase
      .from("counterparties")
      .select("id, name")
      .eq("couple_id", session.couple.id)
      .eq("archived", false)
      .order("name"),
  ]);

  if (saldosRes.error) {
    console.error("Erro ao carregar account_balances em fixas:", saldosRes.error);
  }

  const todasContas = (contasRes.data ?? []) as Account[];
  const donoPorConta = new Map(todasContas.map((c) => [c.id, c.owner_profile_id]));

  // Conta conjunta fica fora do individual de propósito — mesma regra da
  // Home: sem dono único, somar metade sem uma regra explícita inventaria
  // patrimônio ou custo fixo de alguém.
  const contas = pessoaDaVisao
    ? todasContas.filter((c) => c.owner_profile_id === pessoaDaVisao)
    : todasContas;

  const patrimonioAtual = contas.reduce((acc, c) => {
    const saldo = (saldosRes.data as AccountBalance[] | null)?.find(
      (s) => s.account_id === c.id,
    );
    return acc + (saldo?.balance_primary_cents ?? 0);
  }, 0);

  const idsContasDaVisao = new Set(contas.map((c) => c.id));
  const recorrenciasTodas = (recorrenciasRes.data ?? []) as Recurrence[];
  // Recorrência sem conta definida não tem como saber de quem é — some do
  // individual, mas continua contando no Casal.
  const recorrencias = pessoaDaVisao
    ? recorrenciasTodas.filter((r) => r.account_id !== null && idsContasDaVisao.has(r.account_id))
    : recorrenciasTodas;

  const idsLancados = new Set(
    (lancadasRes.data ?? [])
      .map((t) => t.recurrence_id)
      .filter((id): id is string => !!id),
  );

  const categorias = (categoriasRes.data ?? []) as Category[];
  let transacoesAnalise = analiseRes.data ?? [];
  if (pessoaDaVisao) {
    transacoesAnalise = transacoesAnalise.filter((t) =>
      pertenceAPessoa(t, pessoaDaVisao, donoPorConta),
    );
  }
  const custoFixoPorCategoria = agregarDespesasPorCategoria(transacoesAnalise, categorias);
  const mesesAnalise = 3;

  return (
    <FixasClient
      recorrencias={recorrencias}
      idsLancadosEsteMes={[...idsLancados]}
      patrimonioAtual={patrimonioAtual}
      contas={contas}
      categorias={categorias}
      mesAtual={mesAtual}
      hoje={hoje}
      moedaCasal={session.couple.primary_currency}
      opcoesVisao={opcoesVisao}
      visao={visao}
      custoFixoPorCategoria={custoFixoPorCategoria}
      mesesAnalise={mesesAnalise}
      membros={session.members.map((m) => ({
        profile_id: m.profile_id,
        profile: m.profile,
      }))}
      contrapartes={contrapartesRes.data ?? []}
    />
  );
}
