"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseBRL } from "@/lib/money";
import { gravarSplits } from "@/app/(app)/transacoes/actions";
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
  counterparty_id?: string | null;
  day_of_month: string;
  kind: RecurrenceKind;
  split_mode: SplitMode;
  /** Só quando split_mode = 'custom': profile_id -> percentual (0..100), precisa somar 100. */
  custom_split?: Record<string, number>;
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

  const splitMode: SplitMode = input.type === "despesa" ? input.split_mode : "none";

  let customSplit: Record<string, number> | null = null;
  if (splitMode === "custom") {
    const soma = Object.values(input.custom_split ?? {}).reduce((a, b) => a + b, 0);
    if (Math.round(soma) !== 100) {
      return { ok: false, error: "Os percentuais precisam somar 100%." };
    }
    customSplit = input.custom_split ?? null;
  }

  const dados = {
    couple_id: session.couple.id,
    description: descricao,
    amount_cents: valor,
    type: input.type,
    account_id: input.account_id || null,
    category_id: input.category_id || null,
    counterparty_id: input.counterparty_id || null,
    day_of_month: dia,
    kind: input.kind,
    split_mode: splitMode,
    custom_split: customSplit,
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
  /** Vem de `recurrence.custom_split` — só usado quando split_mode = 'custom'. */
  custom_split?: Record<string, number> | null;
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

  const { data, error } = await supabase
    .from("transactions")
    .insert({
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
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Não consegui lançar." };

  // Percentual (recorrência) -> centavos (este mês) — o valor de uma conta
  // "variavel" muda todo mês, então o percentual precisa ser recalculado em
  // cima do valor real lançado, não guardado pronto.
  const customShares = input.custom_split
    ? Object.fromEntries(
        Object.entries(input.custom_split).map(([profileId, pct]) => [
          profileId,
          Math.round((valor * pct) / 100),
        ]),
      )
    : undefined;

  const erroSplit = await gravarSplits(
    supabase,
    data.id,
    valor,
    input.split_mode,
    session.members,
    customShares,
  );
  if (erroSplit) return { ok: false, error: erroSplit };

  revalidatePath("/fixas");
  revalidatePath("/transacoes");
  revalidatePath("/");
  revalidatePath("/orcamentos");
  revalidatePath("/acerto");
  return { ok: true };
}
