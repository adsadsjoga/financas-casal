"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseBRL } from "@/lib/money";
import { hojeISO } from "@/lib/dates";
import type { LoanDirection, LoanLinkRole } from "@/lib/database.types";

export type EmprestimoAction = { ok: boolean; error?: string; id?: string };

export async function salvarEmprestimo(input: {
  id?: string;
  direction: LoanDirection;
  description: string;
  principal: string;
  occurredOn: string;
  expectedReturnDate: string;
  counterpartyId: string | null;
  notes: string;
}): Promise<EmprestimoAction> {
  const session = await requireSession();
  const supabase = await createClient();

  const description = input.description.trim();
  if (!description) return { ok: false, error: "Dê uma descrição para o empréstimo." };

  const principal = parseBRL(input.principal);
  if (principal === null || principal <= 0) return { ok: false, error: "Valor inválido." };

  const payload = {
    couple_id: session.couple.id,
    direction: input.direction,
    description,
    principal_cents: principal,
    occurred_on: input.occurredOn || hojeISO(),
    expected_return_date: input.expectedReturnDate || null,
    counterparty_id: input.counterpartyId,
    notes: input.notes.trim(),
  };

  const result = input.id
    ? await supabase
        .from("loans")
        .update(payload)
        .eq("id", input.id)
        .eq("couple_id", session.couple.id)
        .select("id")
        .single()
    : await supabase.from("loans").insert(payload).select("id").single();

  if (result.error) return { ok: false, error: result.error.message };
  revalidatePath("/emprestimos");
  revalidatePath("/emprestimos/" + result.data.id);
  return { ok: true, id: result.data.id };
}

/**
 * Edita só os dados descritivos de um empréstimo já criado (descrição,
 * contraparte, previsão de devolução, observações) — valor, data original e
 * direção não mudam depois de criado, então não passam por aqui.
 */
export async function atualizarDadosEmprestimo(input: {
  id: string;
  description: string;
  counterpartyId: string | null;
  expectedReturnDate: string;
  notes: string;
}): Promise<EmprestimoAction> {
  const session = await requireSession();
  const supabase = await createClient();

  const description = input.description.trim();
  if (!description) return { ok: false, error: "Dê uma descrição para o empréstimo." };

  const { error } = await supabase
    .from("loans")
    .update({
      description,
      counterparty_id: input.counterpartyId,
      expected_return_date: input.expectedReturnDate || null,
      notes: input.notes.trim(),
    })
    .eq("id", input.id)
    .eq("couple_id", session.couple.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/emprestimos");
  revalidatePath("/emprestimos/" + input.id);
  return { ok: true };
}

export async function arquivarEmprestimo(id: string, archived: boolean): Promise<EmprestimoAction> {
  const session = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("loans")
    .update({ archived })
    .eq("id", id)
    .eq("couple_id", session.couple.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/emprestimos");
  revalidatePath("/emprestimos/" + id);
  return { ok: true };
}

export async function vincularLancamentoEmprestimo(input: {
  loanId: string;
  transactionId: string;
  role: LoanLinkRole;
}): Promise<EmprestimoAction> {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: tx } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", input.transactionId)
    .eq("couple_id", session.couple.id)
    .maybeSingle();
  if (!tx) return { ok: false, error: "Lançamento não encontrado no casal." };

  const { error } = await supabase.from("loan_transaction_links").insert({
    couple_id: session.couple.id,
    loan_id: input.loanId,
    transaction_id: input.transactionId,
    role: input.role,
  });

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Esse lançamento já está vinculado." : error.message,
    };
  }
  revalidatePath("/emprestimos");
  revalidatePath("/emprestimos/" + input.loanId);
  revalidatePath("/transacoes");
  return { ok: true };
}

/** Desfaz um vínculo — o lançamento continua existindo, só solta a ligação com o empréstimo. */
export async function desvincularLancamentoEmprestimo(
  loanId: string,
  transactionId: string,
): Promise<EmprestimoAction> {
  const session = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from("loan_transaction_links")
    .delete()
    .eq("loan_id", loanId)
    .eq("transaction_id", transactionId)
    .eq("couple_id", session.couple.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/emprestimos");
  revalidatePath("/emprestimos/" + loanId);
  revalidatePath("/transacoes");
  return { ok: true };
}

export interface TransacaoBuscaEmprestimo {
  id: string;
  type: string;
  description: string;
  occurred_on: string;
  amount_primary_cents: number;
  category_id: string | null;
  account_id: string;
}

/**
 * Busca lançamentos do casal por texto, de qualquer conta/tipo, pra vincular
 * a este empréstimo — mesmo padrão de
 * `carros/actions.ts:buscarTransacoesParaVincularCarro`.
 */
export async function buscarTransacoesParaVincularEmprestimo(
  loanId: string,
  termo: string,
): Promise<TransacaoBuscaEmprestimo[]> {
  const session = await requireSession();
  const supabase = await createClient();

  const busca = termo.trim();
  if (!busca) return [];

  const [{ data: transacoes }, { data: vinculadas }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, type, description, occurred_on, amount_primary_cents, category_id, account_id")
      .eq("couple_id", session.couple.id)
      .ilike("description", `%${busca}%`)
      .order("occurred_on", { ascending: false })
      .limit(40),
    supabase.from("loan_transaction_links").select("transaction_id").eq("loan_id", loanId),
  ]);

  const jaVinculadas = new Set((vinculadas ?? []).map((v) => v.transaction_id));
  return (transacoes ?? []).filter((t) => !jaVinculadas.has(t.id));
}
