"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/dates";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Registra que alguém pagou o que devia. Não mexe em nenhuma transação — só
 * abate do saldo do acerto, preservando o histórico de quem pagou o quê.
 */
export async function registrarAcerto(
  de: string,
  para: string,
  amountCents: number,
  nota: string,
): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  if (de === para) {
    return { ok: false, error: "Não dá para acertar consigo mesmo." };
  }
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false, error: "Valor inválido." };
  }

  const { error } = await supabase.from("settlements").insert({
    couple_id: session.couple.id,
    from_profile: de,
    to_profile: para,
    amount_cents: amountCents,
    settled_on: hojeISO(),
    note: nota.trim(),
    created_by: session.userId,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/acerto");
  revalidatePath("/");
  return { ok: true };
}

export async function desfazerAcerto(id: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("settlements").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/acerto");
  revalidatePath("/");
  return { ok: true };
}
