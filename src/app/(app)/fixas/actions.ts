"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseBRL } from "@/lib/money";
import type { RecurrenceKind, SplitMode, TxType } from "@/lib/database.types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface RecorrenciaInput {
  id?: string;
  description: string;
  amount: string;
  type: TxType;
  account_id?: string;
  category_id?: string;
  day_of_month: string;
  kind: RecurrenceKind;
  split_mode: SplitMode;
}

export async function salvarRecorrencia(input: RecorrenciaInput): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const descricao = input.description.trim();
  if (!descricao) return { ok: false, error: "Dê um nome para a conta fixa." };

  const valor = parseBRL(input.amount);
  if (valor === null || valor <= 0) return { ok: false, error: "Valor inválido." };

  const dia = Number(input.day_of_month);
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    return { ok: false, error: "Dia do mês precisa ser entre 1 e 31." };
  }

  const dados = {
    couple_id: session.couple.id,
    description: descricao,
    amount_cents: valor,
    type: input.type,
    account_id: input.account_id || null,
    category_id: input.category_id || null,
    day_of_month: dia,
    kind: input.kind,
    split_mode: input.type === "despesa" ? input.split_mode : ("none" as SplitMode),
  };

  const { error } = input.id
    ? await supabase.from("recurrences").update(dados).eq("id", input.id)
    : await supabase.from("recurrences").insert(dados);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/fixas");
  revalidatePath("/");
  return { ok: true };
}

export async function arquivarRecorrencia(id: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("recurrences").update({ active: false }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/fixas");
  revalidatePath("/");
  return { ok: true };
}

export interface LancarRecorrenciaInput {
  recurrence_id: string;
  account_id: string;
  category_id?: string;
  type: TxType;
  amount: string;
  description: string;
  occurred_on: string;
  split_mode: SplitMode;
}

/**
 * Transforma a recorrente numa transação de verdade. O usuário confirma
 * (e pode ajustar o valor, no caso de conta variável) antes de gravar —
 * nada é lançado sozinho.
 */
export async function lancarRecorrencia(input: LancarRecorrenciaInput): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  if (!input.account_id) return { ok: false, error: "Escolha a conta." };

  const valor = parseBRL(input.amount);
  if (valor === null || valor <= 0) return { ok: false, error: "Valor inválido." };

  const { error } = await supabase.from("transactions").insert({
    couple_id: session.couple.id,
    account_id: input.account_id,
    category_id: input.category_id || null,
    created_by: session.userId,
    payer_profile_id: input.type === "despesa" ? session.userId : null,
    type: input.type,
    amount_cents: valor,
    description: input.description.trim(),
    occurred_on: input.occurred_on,
    split_mode: input.split_mode,
    recurrence_id: input.recurrence_id,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/fixas");
  revalidatePath("/transacoes");
  revalidatePath("/");
  revalidatePath("/orcamentos");
  return { ok: true };
}
