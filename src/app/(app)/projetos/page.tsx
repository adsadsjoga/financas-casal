import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resumirProjetos } from "@/lib/projetos";
import type { Project, Transaction } from "@/lib/database.types";

import { ProjetosClient } from "./projetos-client";

export const metadata = { title: "Projetos · Finanças do Casal" };

export default async function ProjetosPage({
  searchParams,
}: {
  searchParams: Promise<{ projeto?: string }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const params = await searchParams;

  const [projetosRes, vinculosRes] = await Promise.all([
    supabase.from("projects").select("*").eq("couple_id", session.couple.id).order("name"),
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
        .select("id, type, description, occurred_on, amount_primary_cents")
        .in("id", idsVinculados)
    : { data: [] };

  const transacoes = (transacoesRes.data ?? []) as Array<
    Pick<Transaction, "id" | "type" | "description" | "occurred_on" | "amount_primary_cents">
  >;

  const resumos = resumirProjetos(transacoes, vinculos, projetos);

  const projetoAberto = projetos.find((p) => p.id === params.projeto) ?? null;
  const transacoesDoProjeto = projetoAberto
    ? vinculos
        .filter((v) => v.project_id === projetoAberto.id)
        .map((v) => transacoes.find((t) => t.id === v.transaction_id))
        .filter((t): t is (typeof transacoes)[number] => t !== undefined)
        .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
    : [];

  return (
    <ProjetosClient
      resumos={resumos}
      projetoAberto={projetoAberto}
      transacoesDoProjeto={transacoesDoProjeto}
      moeda={session.couple.primary_currency}
    />
  );
}
