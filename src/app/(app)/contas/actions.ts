"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseBRL } from "@/lib/money";
import type { AccountType } from "@/lib/database.types";

export interface ContaInput {
  id?: string;
  name: string;
  type: AccountType;
  /** ISO 4217. Não muda depois de criada. */
  currency: string;
  /** "casal" ou o profile_id do dono. */
  owner: string;
  saldoInicial: string;
  color: string;
  is_private: boolean;
  closing_day?: string;
  due_day?: string;
  limite?: string;
  payment_account_id?: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function diaValido(v: string | undefined): number | null {
  if (!v || v.trim() === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 31) return null;
  return n;
}

export async function salvarConta(input: ContaInput): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const nome = input.name.trim();
  if (!nome) return { ok: false, error: "Dê um nome para a conta." };

  const saldo = input.saldoInicial.trim() === "" ? 0 : parseBRL(input.saldoInicial);
  if (saldo === null) return { ok: false, error: "Saldo inicial inválido." };

  const ehCartao = input.type === "cartao";
  const fechamento = ehCartao ? diaValido(input.closing_day) : null;
  const vencimento = ehCartao ? diaValido(input.due_day) : null;

  if (ehCartao && input.closing_day && fechamento === null) {
    return { ok: false, error: "Dia de fechamento precisa ser entre 1 e 31." };
  }
  if (ehCartao && input.due_day && vencimento === null) {
    return { ok: false, error: "Dia de vencimento precisa ser entre 1 e 31." };
  }

  const limite = input.limite?.trim() ? parseBRL(input.limite) : null;
  if (input.limite?.trim() && limite === null) {
    return { ok: false, error: "Limite do cartão inválido." };
  }

  const owner = input.owner === "casal" ? null : input.owner;
  if (input.is_private && !owner) {
    return { ok: false, error: "Só conta individual pode ser privada." };
  }

  const moeda = (input.currency || session.couple.primary_currency).toUpperCase();
  if (!/^[A-Z]{3}$/.test(moeda)) {
    return { ok: false, error: "Moeda inválida." };
  }

  const dados = {
    couple_id: session.couple.id,
    owner_profile_id: owner,
    name: nome,
    type: input.type,
    initial_balance_cents: saldo,
    color: input.color,
    is_private: input.is_private,
    closing_day: fechamento,
    due_day: vencimento,
    credit_limit_cents: limite,
    payment_account_id: input.payment_account_id || null,
  };

  // A moeda só entra na criação: trocar depois faria todo o histórico daquela
  // conta mudar de significado sem ninguém perceber.
  const { error } = input.id
    ? await supabase.from("accounts").update(dados).eq("id", input.id)
    : await supabase.from("accounts").insert({ ...dados, currency: moeda });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/contas");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Contas não são apagadas — são arquivadas. Apagar levaria junto o histórico
 * de transações e estragaria os gráficos dos meses anteriores.
 */
export async function arquivarConta(id: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("accounts")
    .update({ archived: true })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/contas");
  revalidatePath("/");
  return { ok: true };
}

export async function reativarConta(id: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("accounts")
    .update({ archived: false })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/contas");
  revalidatePath("/");
  return { ok: true };
}
