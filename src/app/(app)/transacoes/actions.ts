"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseBRL, splitCents } from "@/lib/money";
import { calcularShares } from "@/lib/splits";
import { obterCotacao } from "@/lib/fx";
import { addMesesMantendoDia } from "@/lib/dates";
import type { SplitMode, TxType } from "@/lib/database.types";

export interface TransacaoInput {
  id?: string;
  type: TxType;
  account_id: string;
  transfer_account_id?: string;
  category_id?: string;
  valor: string;
  description: string;
  occurred_on: string;
  payer_profile_id?: string;
  split_mode: SplitMode;
  /** profile_id -> centavos, só quando split_mode = "custom". */
  custom_shares?: Record<string, number>;
  /** 1 = à vista. Acima disso vira compra parcelada. */
  parcelas?: number;
  /** Projetos aos quais o lançamento pertence. Substitui os vínculos atuais. */
  project_ids?: string[];
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function revalidarTudo() {
  revalidatePath("/");
  revalidatePath("/transacoes");
  revalidatePath("/contas");
  revalidatePath("/acerto");
  revalidatePath("/orcamentos");
  revalidatePath("/projetos");
}

/**
 * Deixa os vínculos de projeto exatamente como `projectIds` pede.
 *
 * Numa compra parcelada todas as parcelas entram no mesmo projeto: uma viagem
 * paga em 3x continua custando o total, e vincular só a primeira parcela
 * mostraria um terço do custo real.
 */
async function sincronizarProjetos(
  supabase: SupabaseServer,
  transactionIds: string[],
  projectIds: string[] | undefined,
): Promise<string | null> {
  if (projectIds === undefined || transactionIds.length === 0) return null;

  const { error: erroDelete } = await supabase
    .from("project_transactions")
    .delete()
    .in("transaction_id", transactionIds);
  if (erroDelete) return erroDelete.message;

  if (projectIds.length === 0) return null;

  const linhas = transactionIds.flatMap((transaction_id) =>
    projectIds.map((project_id) => ({ project_id, transaction_id })),
  );
  const { error } = await supabase.from("project_transactions").insert(linhas);
  return error?.message ?? null;
}

export async function salvarTransacao(
  input: TransacaoInput,
): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const valor = parseBRL(input.valor);
  if (valor === null) return { ok: false, error: "Valor inválido." };
  if (valor <= 0) return { ok: false, error: "O valor precisa ser maior que zero." };

  if (!input.account_id) return { ok: false, error: "Escolha a conta." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurred_on)) {
    return { ok: false, error: "Data inválida." };
  }

  if (input.type === "transferencia") {
    if (!input.transfer_account_id) {
      return { ok: false, error: "Escolha a conta de destino." };
    }
    if (input.transfer_account_id === input.account_id) {
      return { ok: false, error: "Origem e destino precisam ser diferentes." };
    }
  }

  const splitMode: SplitMode =
    input.type === "despesa" ? input.split_mode : "none";

  // Conta em outra moeda: busca a cotação do dia do lançamento e congela nela.
  const { data: contaInfo } = await supabase
    .from("accounts")
    .select("currency")
    .eq("id", input.account_id)
    .single();

  const moedaConta = contaInfo?.currency ?? session.couple.primary_currency;
  const cotacao =
    moedaConta === session.couple.primary_currency
      ? { rate: 1 }
      : await obterCotacao(
          moedaConta,
          session.couple.primary_currency,
          input.occurred_on,
        );

  const base = {
    rate_to_primary: cotacao.rate,
    couple_id: session.couple.id,
    account_id: input.account_id,
    category_id: input.category_id || null,
    created_by: session.userId,
    payer_profile_id:
      input.type === "despesa"
        ? input.payer_profile_id || session.userId
        : null,
    type: input.type,
    description: input.description.trim(),
    transfer_account_id:
      input.type === "transferencia" ? input.transfer_account_id! : null,
    split_mode: splitMode,
  };

  // --- Edição: mexe só nesta linha, mesmo se for uma parcela de um grupo. ---
  if (input.id) {
    const { error } = await supabase
      .from("transactions")
      .update({ ...base, amount_cents: valor, occurred_on: input.occurred_on })
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };

    const erroSplit = await gravarSplits(
      supabase,
      input.id,
      valor,
      splitMode,
      session.members,
      input.custom_shares,
    );
    if (erroSplit) return { ok: false, error: erroSplit };

    const erroProjetos = await sincronizarProjetos(supabase, [input.id], input.project_ids);
    if (erroProjetos) return { ok: false, error: erroProjetos };

    revalidarTudo();
    return { ok: true };
  }

  // --- Criação ---
  const parcelas = Math.max(1, Math.min(72, Math.floor(input.parcelas ?? 1)));

  if (parcelas === 1) {
    const { data, error } = await supabase
      .from("transactions")
      .insert({ ...base, amount_cents: valor, occurred_on: input.occurred_on })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    const erroSplit = await gravarSplits(
      supabase,
      data.id,
      valor,
      splitMode,
      session.members,
      input.custom_shares,
    );
    if (erroSplit) return { ok: false, error: erroSplit };

    const erroProjetos = await sincronizarProjetos(supabase, [data.id], input.project_ids);
    if (erroProjetos) return { ok: false, error: erroProjetos };

    revalidarTudo();
    return { ok: true };
  }

  // Parcelado: o valor é fatiado sem perder centavo — 100,00 em 3 vira
  // 33,34 + 33,33 + 33,33, e a soma bate exatamente com a compra.
  const valores = splitCents(valor, new Array(parcelas).fill(1));
  const grupo = crypto.randomUUID();

  const linhas = valores.map((v, i) => ({
    ...base,
    amount_cents: v,
    occurred_on: addMesesMantendoDia(input.occurred_on, i),
    installment_group_id: grupo,
    installment_no: i + 1,
    installment_total: parcelas,
  }));

  const { data, error } = await supabase
    .from("transactions")
    .insert(linhas)
    .select("id, amount_cents");
  if (error) return { ok: false, error: error.message };

  for (const linha of data ?? []) {
    const erroSplit = await gravarSplits(
      supabase,
      linha.id,
      linha.amount_cents,
      splitMode,
      session.members,
      input.custom_shares,
    );
    if (erroSplit) return { ok: false, error: erroSplit };
  }

  const erroProjetos = await sincronizarProjetos(
    supabase,
    (data ?? []).map((l) => l.id),
    input.project_ids,
  );
  if (erroProjetos) return { ok: false, error: erroProjetos };

  revalidarTudo();
  return { ok: true };
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Regrava os shares da transação. Retorna a mensagem de erro, ou null. */
async function gravarSplits(
  supabase: SupabaseServer,
  transactionId: string,
  amountCents: number,
  mode: SplitMode,
  members: Array<{ profile_id: string; income_cents: number }>,
  custom?: Record<string, number>,
): Promise<string | null> {
  await supabase
    .from("transaction_splits")
    .delete()
    .eq("transaction_id", transactionId);

  if (mode === "none") return null;

  const shares = calcularShares(amountCents, mode, members, custom);
  if (shares.length === 0) return null;

  const { error } = await supabase.from("transaction_splits").insert(
    shares.map((s) => ({
      transaction_id: transactionId,
      profile_id: s.profile_id,
      share_cents: s.share_cents,
    })),
  );
  return error ? error.message : null;
}

export async function excluirTransacao(
  id: string,
  grupoInteiro = false,
): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  if (grupoInteiro) {
    const { data } = await supabase
      .from("transactions")
      .select("installment_group_id")
      .eq("id", id)
      .single();

    if (data?.installment_group_id) {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("installment_group_id", data.installment_group_id);
      if (error) return { ok: false, error: error.message };
      revalidarTudo();
      return { ok: true };
    }
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidarTudo();
  return { ok: true };
}
