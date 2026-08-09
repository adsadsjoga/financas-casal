"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/dates";
import { gravarSplits } from "@/app/(app)/transacoes/actions";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Insere o settlement em si — compartilhado por `registrarAcerto` (acerto avulso) e `vincularPagamentoDivisao` (itemizado). */
async function inserirSettlement(
  supabase: SupabaseServer,
  params: {
    coupleId: string;
    de: string;
    para: string;
    amountCents: number;
    settledOn: string;
    nota: string;
    createdBy: string;
    transactionId: string | null;
  },
): Promise<{ id: string; error?: undefined } | { id?: undefined; error: string }> {
  const { data, error } = await supabase
    .from("settlements")
    .insert({
      couple_id: params.coupleId,
      from_profile: params.de,
      to_profile: params.para,
      amount_cents: params.amountCents,
      settled_on: params.settledOn,
      note: params.nota.trim(),
      created_by: params.createdBy,
      transaction_id: params.transactionId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Não consegui registrar." };
  return { id: data.id };
}

/**
 * Registra que alguém pagou o que devia. Não mexe na transação vinculada —
 * só abate do saldo do acerto e guarda a referência, preservando o
 * histórico de quem pagou o quê.
 */
export async function registrarAcerto(
  de: string,
  para: string,
  amountCents: number,
  nota: string,
  transactionId?: string | null,
): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  if (de === para) {
    return { ok: false, error: "Não dá para acertar consigo mesmo." };
  }
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false, error: "Valor inválido." };
  }

  const resultado = await inserirSettlement(supabase, {
    coupleId: session.couple.id,
    de,
    para,
    amountCents,
    settledOn: hojeISO(),
    nota,
    createdBy: session.userId,
    transactionId: transactionId || null,
  });
  if (resultado.error) return { ok: false, error: resultado.error };

  revalidatePath("/acerto");
  revalidatePath("/");
  return { ok: true };
}

export interface VincularPagamentoInput {
  expenseTransactionId: string;
  debtorProfileId: string;
  payerProfileId: string;
  /** Share (ou parte dele) dessa despesa que está sendo quitado por essa transferência. */
  amountCents: number;
  transferTransactionId: string;
}

async function atualizarValorSettlementItemizado(
  supabase: SupabaseServer,
  settlementId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("settlement_items")
    .select("amount_cents")
    .eq("settlement_id", settlementId);

  if (error) return error.message;

  const total = (data ?? []).reduce((acc, item) => acc + item.amount_cents, 0);
  const { error: erroUpdate } = await supabase
    .from("settlements")
    .update({ amount_cents: total })
    .eq("id", settlementId);

  return erroUpdate?.message ?? null;
}

/**
 * Liga uma despesa à transferência real que a pagou — funciona tanto pra
 * despesa já dividida (`split_mode <> 'none'`) quanto pra uma que ainda
 * nunca foi marcada como dividida: nesse segundo caso, cria a divisão
 * (`split_mode = 'custom'`) na hora, com o share do devedor sendo
 * exatamente o valor vinculado, sem precisar passar por /transações antes.
 *
 * Reaproveita o settlement já existente pra essa mesma transferência (uma
 * transferência pode cobrir várias comprinhas divididas) em vez de criar um
 * settlement novo a cada vínculo — o `amount_cents` do settlement é sempre
 * o valor real que a transferência moveu, os itens só detalham pra onde foi.
 */
export async function vincularPagamentoDivisao(
  input: VincularPagamentoInput,
): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  if (input.debtorProfileId === input.payerProfileId) {
    return { ok: false, error: "Devedor e pagador precisam ser diferentes." };
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return { ok: false, error: "Valor inválido." };
  }

  const { data: transferencia } = await supabase
    .from("transactions")
    .select("id, occurred_on")
    .eq("id", input.transferTransactionId)
    .eq("couple_id", session.couple.id)
    .maybeSingle();
  if (!transferencia) return { ok: false, error: "Transferência não encontrada no casal." };

  const { data: despesa } = await supabase
    .from("transactions")
    .select("id, amount_cents, split_mode")
    .eq("id", input.expenseTransactionId)
    .eq("couple_id", session.couple.id)
    .maybeSingle();
  if (!despesa) return { ok: false, error: "Despesa não encontrada no casal." };

  const { data: itensDaDespesa, error: erroItensDespesa } = await supabase
    .from("settlement_items")
    .select("amount_cents, settlement:settlements(from_profile, to_profile)")
    .eq("couple_id", session.couple.id)
    .eq("expense_transaction_id", input.expenseTransactionId);
  if (erroItensDespesa) return { ok: false, error: erroItensDespesa.message };

  const totalJaVinculado = (itensDaDespesa ?? []).reduce((acc, item) => {
    const settlement = Array.isArray(item.settlement) ? item.settlement[0] : item.settlement;
    if (
      settlement?.from_profile === input.debtorProfileId &&
      settlement?.to_profile === input.payerProfileId
    ) {
      return acc + item.amount_cents;
    }
    return acc;
  }, 0);

  let shareDevedor = input.amountCents;
  if (despesa.split_mode === "none") {
    if (input.amountCents > despesa.amount_cents) {
      return { ok: false, error: "O valor vinculado não pode ser maior que a despesa." };
    }

    const { error: erroSplitMode } = await supabase
      .from("transactions")
      .update({ split_mode: "custom" })
      .eq("id", despesa.id);
    if (erroSplitMode) return { ok: false, error: erroSplitMode.message };

    const erroSplit = await gravarSplits(
      supabase,
      despesa.id,
      despesa.amount_cents,
      "custom",
      session.members,
      {
        [input.payerProfileId]: despesa.amount_cents - input.amountCents,
        [input.debtorProfileId]: input.amountCents,
      },
    );
    if (erroSplit) return { ok: false, error: erroSplit };
  } else {
    const { data: splitDevedor, error: erroSplitDevedor } = await supabase
      .from("transaction_splits")
      .select("share_cents")
      .eq("transaction_id", despesa.id)
      .eq("profile_id", input.debtorProfileId)
      .maybeSingle();
    if (erroSplitDevedor) return { ok: false, error: erroSplitDevedor.message };
    if (!splitDevedor) {
      return { ok: false, error: "Essa despesa não tem divisão para esse devedor." };
    }
    shareDevedor = splitDevedor.share_cents;
  }

  const restante = shareDevedor - totalJaVinculado;
  if (input.amountCents > restante) {
    return {
      ok: false,
      error:
        restante > 0
          ? "O valor vinculado é maior que o restante dessa despesa."
          : "Essa despesa já está totalmente vinculada.",
    };
  }

  const { data: settlementExistente } = await supabase
    .from("settlements")
    .select("id")
    .eq("couple_id", session.couple.id)
    .eq("transaction_id", input.transferTransactionId)
    .eq("from_profile", input.debtorProfileId)
    .eq("to_profile", input.payerProfileId)
    .maybeSingle();

  let settlementId = settlementExistente?.id;
  if (!settlementId) {
    const resultado = await inserirSettlement(supabase, {
      coupleId: session.couple.id,
      de: input.debtorProfileId,
      para: input.payerProfileId,
      amountCents: input.amountCents,
      settledOn: transferencia.occurred_on,
      nota: "",
      createdBy: session.userId,
      transactionId: input.transferTransactionId,
    });
    if (resultado.error) return { ok: false, error: resultado.error };
    settlementId = resultado.id;
  }
  if (!settlementId) return { ok: false, error: "Não consegui localizar o pagamento." };

  const { error } = await supabase.from("settlement_items").insert({
    couple_id: session.couple.id,
    settlement_id: settlementId,
    expense_transaction_id: input.expenseTransactionId,
    amount_cents: input.amountCents,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "Essa despesa já está vinculada a esse pagamento."
          : error.message,
    };
  }

  const erroAtualizarSettlement = await atualizarValorSettlementItemizado(supabase, settlementId);
  if (erroAtualizarSettlement) return { ok: false, error: erroAtualizarSettlement };

  revalidatePath("/acerto");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Desfaz o vínculo entre uma despesa dividida e o pagamento que a cobria.
 * Se o settlement ficou sem nenhum item, ele só existia por causa desse
 * vínculo -- settlements criados manualmente em "Marcar como acertado"
 * nunca têm item, então nunca são apagados por essa regra.
 */
export async function desvincularPagamentoDivisao(settlementItemId: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("settlement_items")
    .select("id, settlement_id")
    .eq("id", settlementItemId)
    .eq("couple_id", session.couple.id)
    .maybeSingle();
  if (!item) return { ok: false, error: "Vínculo não encontrado." };

  const { error: erroDelete } = await supabase
    .from("settlement_items")
    .delete()
    .eq("id", settlementItemId);
  if (erroDelete) return { ok: false, error: erroDelete.message };

  const { count } = await supabase
    .from("settlement_items")
    .select("id", { count: "exact", head: true })
    .eq("settlement_id", item.settlement_id);

  if (!count) {
    await supabase.from("settlements").delete().eq("id", item.settlement_id);
  } else {
    const erroAtualizarSettlement = await atualizarValorSettlementItemizado(
      supabase,
      item.settlement_id,
    );
    if (erroAtualizarSettlement) return { ok: false, error: erroAtualizarSettlement };
  }

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
