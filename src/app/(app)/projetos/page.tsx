import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resumirProjetos } from "@/lib/projetos";
import { agregarGastosPorPessoa } from "@/lib/dashboard";
import type { Project, Transaction } from "@/lib/database.types";

import { ProjetosClient } from "./projetos-client";

export const metadata = { title: "Projetos · Finanças do Casal" };

export default async function ProjetosPage({
  searchParams,
}: {
  searchParams: Promise<{ projeto?: string; visao?: string }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const params = await searchParams;

  // Mesmo padrão da Home (src/app/(app)/page.tsx): visão individual só
  // existe com parceiro cadastrado.
  const visoesValidas = session.partner
    ? ["casal", session.me.profile_id, session.partner.profile_id]
    : ["casal"];
  const visao = visoesValidas.includes(params.visao ?? "") ? params.visao! : "casal";
  const pessoaDaVisao = visao === "casal" ? null : visao;

  const [projetosRes, vinculosRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("couple_id", session.couple.id)
      // "negocio" (despesas gerais do negócio de carros) ainda não tem tela
      // própria — fica de fora daqui até existir.
      .eq("kind", "pessoal")
      .order("name"),
    supabase.from("project_transactions").select("project_id, transaction_id"),
  ]);

  const projetos = (projetosRes.data ?? []) as Project[];
  const vinculos = vinculosRes.data ?? [];

  // Busca só as transações que algum projeto usa — sem isso a tela carregaria
  // os milhares de lançamentos do casal para somar algumas dezenas.
  const idsVinculados = [...new Set(vinculos.map((v) => v.transaction_id))];
  const transacoesRes = idsVinculados.length
    ? await supabase
        .from("transactions")
        .select(
          "id, type, description, occurred_on, amount_primary_cents, payer_profile_id",
        )
        .in("id", idsVinculados)
    : { data: [] };

  const transacoes = (transacoesRes.data ?? []) as Array<
    Pick<
      Transaction,
      "id" | "type" | "description" | "occurred_on" | "amount_primary_cents" | "payer_profile_id"
    >
  >;

  // Visão individual não esconde projeto nenhum — só troca o que os números
  // mostram: em vez do custo total, a fatia daquela pessoa.
  const transacoesDaVisao = pessoaDaVisao
    ? transacoes.filter((t) => t.payer_profile_id === pessoaDaVisao)
    : transacoes;

  const resumos = resumirProjetos(transacoesDaVisao, vinculos, projetos);

  const projetoAberto = projetos.find((p) => p.id === params.projeto) ?? null;
  const transacoesDoProjeto = projetoAberto
    ? vinculos
        .filter((v) => v.project_id === projetoAberto.id)
        .map((v) => transacoes.find((t) => t.id === v.transaction_id))
        .filter((t): t is (typeof transacoes)[number] => t !== undefined)
        .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
    : [];

  // Card "Por pessoa" no projeto aberto — sempre com o total real (não filtra
  // pela visão), pra sempre mostrar a divisão completa entre os dois.
  const gastosPorPessoa =
    projetoAberto && session.partner
      ? agregarGastosPorPessoa(
          vinculos
            .filter((v) => v.project_id === projetoAberto.id)
            .map((v) => transacoes.find((t) => t.id === v.transaction_id))
            .filter((t): t is (typeof transacoes)[number] => t !== undefined),
          session.members.map((m) => ({
            profile_id: m.profile_id,
            display_name: m.profile.display_name,
            avatar_emoji: m.profile.avatar_emoji,
          })),
        )
      : null;

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

  return (
    <ProjetosClient
      resumos={resumos}
      projetoAberto={projetoAberto}
      transacoesDoProjeto={transacoesDoProjeto}
      gastosPorPessoa={gastosPorPessoa}
      opcoesVisao={opcoesVisao}
      visao={visao}
      moeda={session.couple.primary_currency}
    />
  );
}
