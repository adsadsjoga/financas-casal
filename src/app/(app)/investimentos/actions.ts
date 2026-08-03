"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function salvarQuantidadeAtivo(ticker: string, quantidade: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const valor = Number(quantidade.replace(",", "."));
  if (!Number.isFinite(valor) || valor < 0) {
    return { ok: false, error: "Quantidade inválida." };
  }

  const { error } = await supabase.from("investment_holdings").upsert(
    {
      couple_id: session.couple.id,
      ticker,
      quantity: valor,
    },
    { onConflict: "couple_id,ticker" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/investimentos");
  return { ok: true };
}
