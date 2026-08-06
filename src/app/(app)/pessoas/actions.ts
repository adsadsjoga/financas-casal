"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalizeDescription } from "@/lib/normalize-text";
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

/**
 * Ensina uma grafia nova pro sistema reconhecer como sendo dessa pessoa —
 * é a causa raiz de "os valores não batem": quando o extrato traz uma
 * variação de nome que nenhum apelido cadastrado cobre, a transação fica
 * sem contraparte, silenciosamente. Antes só dava pra corrigir isso mexendo
 * direto no banco.
 *
 * Salva já normalizado (igual `normalize_description()` do Postgres) porque
 * `acharContraparte()` casa por substring contra a descrição JÁ normalizada
 * — um padrão com acento/maiúscula nunca bateria com nada.
 */
export async function adicionarAlias(counterpartyId: string, pattern: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const normalizado = normalizeDescription(pattern);
  if (!normalizado) return { ok: false, error: "Digite um trecho do nome." };

  const { data: dona } = await supabase
    .from("counterparties")
    .select("id")
    .eq("id", counterpartyId)
    .eq("couple_id", session.couple.id)
    .maybeSingle();
  if (!dona) return { ok: false, error: "Pessoa não encontrada." };

  const { error } = await supabase
    .from("counterparty_aliases")
    .insert({ counterparty_id: counterpartyId, pattern: normalizado });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Esse apelido já está cadastrado." };
    return { ok: false, error: error.message };
  }
  revalidatePath("/pessoas");
  revalidatePath("/carros");
  return { ok: true };
}

export async function removerAlias(aliasId: string, counterpartyId: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: dona } = await supabase
    .from("counterparties")
    .select("id")
    .eq("id", counterpartyId)
    .eq("couple_id", session.couple.id)
    .maybeSingle();
  if (!dona) return { ok: false, error: "Pessoa não encontrada." };

  const { error } = await supabase
    .from("counterparty_aliases")
    .delete()
    .eq("id", aliasId)
    .eq("counterparty_id", counterpartyId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/pessoas");
  revalidatePath("/carros");
  return { ok: true };
}
