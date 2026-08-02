"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseBRL } from "@/lib/money";
import type { BudgetScope } from "@/lib/database.types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface OrcamentoInput {
  id?: string;
  category_id: string;
  month: string;
  scope: BudgetScope;
  /** Obrigatório quando scope = "pessoal". */
  profile_id?: string;
  limite: string;
}

export async function salvarOrcamento(input: OrcamentoInput): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  if (!input.category_id) return { ok: false, error: "Escolha a categoria." };
  if (input.scope === "pessoal" && !input.profile_id) {
    return { ok: false, error: "Escolha de quem é o orçamento." };
  }

  const limite = parseBRL(input.limite);
  if (limite === null || limite <= 0) {
    return { ok: false, error: "Limite inválido." };
  }

  const profileId = input.scope === "pessoal" ? (input.profile_id ?? null) : null;

  // Sem onConflict aqui de propósito: o índice único da tabela usa
  // coalesce(profile_id, uuid-zero), uma expressão — o upsert do
  // supabase-js só casa contra colunas literais. Busca e decide na mão.
  let existenteId = input.id ?? null;
  if (!existenteId) {
    let busca = supabase
      .from("budgets")
      .select("id")
      .eq("couple_id", session.couple.id)
      .eq("category_id", input.category_id)
      .eq("month", input.month);
    busca = profileId ? busca.eq("profile_id", profileId) : busca.is("profile_id", null);
    const { data } = await busca.maybeSingle();
    existenteId = data?.id ?? null;
  }

  const dados = {
    couple_id: session.couple.id,
    category_id: input.category_id,
    month: input.month,
    scope: input.scope,
    profile_id: profileId,
    limit_cents: limite,
  };

  const { error } = existenteId
    ? await supabase.from("budgets").update(dados).eq("id", existenteId)
    : await supabase.from("budgets").insert(dados);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/orcamentos");
  return { ok: true };
}

export async function excluirOrcamento(id: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/orcamentos");
  return { ok: true };
}
