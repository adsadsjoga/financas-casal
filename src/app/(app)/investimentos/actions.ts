"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseBRL } from "@/lib/money";

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

export interface HoldingInput {
  ticker: string;
  quantity: string;
  /** Vazio = sem preço médio informado. */
  avgPrice?: string;
  notes?: string;
}

/**
 * Edita a posição de um ativo (quantidade, preço médio, notas). O "ativo"
 * continua sendo derivado da descrição das transações — isto só grava a
 * camada manual por cima (mesma tabela de `salvarQuantidadeAtivo`, agora com
 * mais campos).
 */
export async function salvarHolding(input: HoldingInput): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const ticker = input.ticker.trim().toUpperCase();
  if (!ticker) return { ok: false, error: "Informe o ticker do ativo." };

  const quantity = Number(input.quantity.replace(",", "."));
  if (!Number.isFinite(quantity) || quantity < 0) {
    return { ok: false, error: "Quantidade inválida." };
  }

  let avgPriceCents: number | null = null;
  if (input.avgPrice?.trim()) {
    const n = parseBRL(input.avgPrice);
    if (n === null || n <= 0) return { ok: false, error: "Preço médio inválido." };
    avgPriceCents = n;
  }

  const { error } = await supabase.from("investment_holdings").upsert(
    {
      couple_id: session.couple.id,
      ticker,
      quantity,
      avg_price_cents: avgPriceCents,
      notes: input.notes?.trim() || null,
    },
    { onConflict: "couple_id,ticker" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/investimentos");
  return { ok: true };
}

export async function arquivarHolding(ticker: string, archived: boolean): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  // Upsert simples sobrescreveria quantidade/preço médio já salvos com o
  // default — busca a linha existente primeiro pra só trocar o `archived`.
  const { data: existente } = await supabase
    .from("investment_holdings")
    .select("quantity, avg_price_cents, notes")
    .eq("couple_id", session.couple.id)
    .eq("ticker", ticker)
    .maybeSingle();

  const { error } = await supabase.from("investment_holdings").upsert(
    {
      couple_id: session.couple.id,
      ticker,
      archived,
      quantity: existente?.quantity ?? 0,
      avg_price_cents: existente?.avg_price_cents ?? null,
      notes: existente?.notes ?? null,
    },
    { onConflict: "couple_id,ticker" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/investimentos");
  return { ok: true };
}

/**
 * Remove só a camada manual (quantidade/preço médio/notas) — as transações
 * que originaram a posição continuam intactas, então o ativo pode reaparecer
 * na lista (sem valor de mercado) se ainda houver lançamento na categoria
 * "Investimentos" com essa descrição.
 */
export async function excluirHolding(ticker: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("investment_holdings")
    .delete()
    .eq("couple_id", session.couple.id)
    .eq("ticker", ticker);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/investimentos");
  return { ok: true };
}

export interface DividendoInput {
  id?: string;
  ticker: string;
  amount: string;
  paid_on: string;
  notes?: string;
}

export async function salvarDividendo(input: DividendoInput): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const ticker = input.ticker.trim().toUpperCase();
  if (!ticker) return { ok: false, error: "Informe o ticker do ativo." };

  const valor = parseBRL(input.amount);
  if (valor === null || valor <= 0) return { ok: false, error: "Valor inválido." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paid_on)) {
    return { ok: false, error: "Data inválida." };
  }

  const dados = {
    couple_id: session.couple.id,
    ticker,
    amount_cents: valor,
    paid_on: input.paid_on,
    notes: input.notes?.trim() || null,
  };

  const { error } = input.id
    ? await supabase.from("investment_dividends").update(dados).eq("id", input.id)
    : await supabase.from("investment_dividends").insert(dados);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/investimentos");
  return { ok: true };
}

export async function excluirDividendo(id: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("investment_dividends").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/investimentos");
  return { ok: true };
}
