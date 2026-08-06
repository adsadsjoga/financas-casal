"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CounterpartyKind } from "@/lib/database.types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Troca o tipo de relação de uma contraparte (Pessoa, Cliente, Conta própria…). */
export async function mudarTipoContraparte(id: string, kind: CounterpartyKind): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("counterparties")
    .update({ kind })
    .eq("id", id)
    .eq("couple_id", session.couple.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/pessoas");
  return { ok: true };
}

/** Arquiva/reativa uma contraparte — nunca exclui, o histórico de lançamentos continua. */
export async function arquivarContraparte(id: string, archived: boolean): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("counterparties")
    .update({ archived })
    .eq("id", id)
    .eq("couple_id", session.couple.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/pessoas");
  return { ok: true };
}
