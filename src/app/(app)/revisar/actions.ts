"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function revalidarTudo() {
  revalidatePath("/");
  revalidatePath("/revisar");
  revalidatePath("/transacoes");
  revalidatePath("/orcamentos");
}

/** Troca a categoria e tira da fila de revisão. */
export async function revisarComCategoria(
  transactionId: string,
  categoryId: string,
): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  if (!categoryId) return { ok: false, error: "Escolha uma categoria." };

  const { data, error } = await supabase
    .from("transactions")
    .update({ category_id: categoryId, needs_review: false })
    .eq("id", transactionId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Não foi possível salvar (lançamento não encontrado ou sem permissão)." };
  }

  revalidarTudo();
  return { ok: true };
}

/** Confirma a categoria atual como está (ex.: "Outras despesas" mesmo, de propósito). */
export async function marcarComoRevisada(transactionId: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .update({ needs_review: false })
    .eq("id", transactionId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Não foi possível confirmar (lançamento não encontrado ou sem permissão)." };
  }

  revalidarTudo();
  return { ok: true };
}

/** Aplica a mesma categoria a vários lançamentos de uma vez (ex.: todos com a mesma descrição/valor). */
export async function revisarEmMassa(
  transactionIds: string[],
  categoryId: string,
): Promise<ActionResult & { atualizados?: number }> {
  await requireSession();
  const supabase = await createClient();

  if (!categoryId) return { ok: false, error: "Escolha uma categoria." };
  if (transactionIds.length === 0) return { ok: false, error: "Nenhum lançamento selecionado." };

  const { data, error } = await supabase
    .from("transactions")
    .update({ category_id: categoryId, needs_review: false })
    .in("id", transactionIds)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Não foi possível salvar (sem permissão nos lançamentos selecionados)." };
  }

  revalidarTudo();
  return { ok: true, atualizados: data.length };
}
