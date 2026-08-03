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

  const { error } = await supabase
    .from("transactions")
    .update({ category_id: categoryId, needs_review: false })
    .eq("id", transactionId);
  if (error) return { ok: false, error: error.message };

  revalidarTudo();
  return { ok: true };
}

/** Confirma a categoria atual como está (ex.: "Outras despesas" mesmo, de propósito). */
export async function marcarComoRevisada(transactionId: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("transactions")
    .update({ needs_review: false })
    .eq("id", transactionId);
  if (error) return { ok: false, error: error.message };

  revalidarTudo();
  return { ok: true };
}
