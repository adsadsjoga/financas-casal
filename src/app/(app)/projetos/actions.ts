"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseBRL } from "@/lib/money";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface ProjetoInput {
  id?: string;
  name: string;
  icon: string;
  /** "Queremos fazer isso, vai custar mais ou menos X" — vazio = sem orçamento. */
  plannedAmount?: string;
}

export async function salvarProjeto(input: ProjetoInput): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const nome = input.name.trim();
  if (!nome) return { ok: false, error: "Dê um nome para o projeto." };

  let plannedAmountCents: number | null = null;
  if (input.plannedAmount?.trim()) {
    const n = parseBRL(input.plannedAmount);
    if (n === null || n <= 0) return { ok: false, error: "Orçamento planejado inválido." };
    plannedAmountCents = n;
  }

  const dados = {
    couple_id: session.couple.id,
    name: nome,
    icon: input.icon || "📁",
    planned_amount_cents: plannedAmountCents,
  };

  const { error } = input.id
    ? await supabase.from("projects").update(dados).eq("id", input.id)
    : await supabase.from("projects").insert(dados);

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Já existe um projeto com esse nome." };
    return { ok: false, error: error.message };
  }

  revalidatePath("/projetos");
  return { ok: true };
}

export async function arquivarProjeto(id: string, archived: boolean): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("projects").update({ archived }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/projetos");
  return { ok: true };
}

/**
 * Exclui o projeto. Os vínculos caem junto por `on delete cascade`, mas as
 * transações em si ficam intactas — projeto é uma etiqueta, não o dono do
 * lançamento.
 */
export async function excluirProjeto(id: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/projetos");
  return { ok: true };
}

export async function vincularProjeto(
  transactionId: string,
  projectId: string,
): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_transactions")
    .insert({ project_id: projectId, transaction_id: transactionId });

  // Vincular o que já está vinculado não é erro do ponto de vista de quem usa.
  if (error && error.code !== "23505") return { ok: false, error: error.message };

  revalidatePath("/projetos");
  revalidatePath("/transacoes");
  return { ok: true };
}

export async function desvincularProjeto(
  transactionId: string,
  projectId: string,
): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("project_transactions")
    .delete()
    .eq("project_id", projectId)
    .eq("transaction_id", transactionId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/projetos");
  revalidatePath("/transacoes");
  return { ok: true };
}

export interface TransacaoBusca {
  id: string;
  type: string;
  description: string;
  occurred_on: string;
  amount_primary_cents: number;
  category_id: string | null;
  account_id: string;
}

/** Lançamentos do casal que batem com o texto buscado — pra vincular em lote a um projeto, mesmo padrão de `PessoaSheet`/`/carros/[id]`. */
export async function buscarTransacoesParaVincular(termo: string): Promise<TransacaoBusca[]> {
  const session = await requireSession();
  const supabase = await createClient();

  const busca = termo.trim();
  if (!busca) return [];

  const { data } = await supabase
    .from("transactions")
    .select("id, type, description, occurred_on, amount_primary_cents, category_id, account_id")
    .eq("couple_id", session.couple.id)
    .in("type", ["receita", "despesa"])
    .ilike("description", `%${busca}%`)
    .order("occurred_on", { ascending: false })
    .limit(40);

  return (data ?? []) as TransacaoBusca[];
}

/** Vincula várias transações de uma vez — repetir uma já vinculada não é erro. */
export async function vincularVariasProjeto(
  transactionIds: string[],
  projectId: string,
): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  if (transactionIds.length === 0) return { ok: true };

  const linhas = transactionIds.map((transactionId) => ({
    project_id: projectId,
    transaction_id: transactionId,
  }));

  const { error } = await supabase
    .from("project_transactions")
    .upsert(linhas, { onConflict: "project_id,transaction_id", ignoreDuplicates: true });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/projetos");
  revalidatePath("/transacoes");
  return { ok: true };
}
