"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { normalizeDescription } from "@/lib/normalize-text";
import type { CounterpartyKind } from "@/lib/database.types";
import type { TransacaoDetalhada } from "@/lib/pessoas";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface BuscarTransacoesDaPessoaResult {
  ok: boolean;
  error?: string;
  transacoes: TransacaoDetalhada[];
}

export async function criarContraparte(input: {
  name: string;
  kind: CounterpartyKind;
  alias?: string;
}): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const nome = input.name.trim();
  if (!nome) return { ok: false, error: "Digite o nome." };

  const { data, error } = await supabase
    .from("counterparties")
    .insert({
      couple_id: session.couple.id,
      name: nome,
      kind: input.kind,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const aliasNormalizado = normalizeDescription(input.alias || nome);
  if (aliasNormalizado) {
    const { error: erroAlias } = await supabase
      .from("counterparty_aliases")
      .insert({ counterparty_id: data.id, pattern: aliasNormalizado });
    if (erroAlias && erroAlias.code !== "23505") {
      return { ok: false, error: erroAlias.message };
    }
  }

  revalidatePath("/pessoas");
  revalidatePath("/acerto");
  return { ok: true };
}

export async function renomearContraparte(id: string, name: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const nome = name.trim();
  if (!nome) return { ok: false, error: "Digite o nome." };

  const { error } = await supabase
    .from("counterparties")
    .update({ name: nome })
    .eq("id", id)
    .eq("couple_id", session.couple.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/pessoas");
  revalidatePath("/acerto");
  return { ok: true };
}

/**
 * Busca as transações de UMA contraparte sob demanda (clique em "Ver
 * lançamentos"), filtrando no Postgres via `transacoes_por_contraparte()` —
 * antes o client recebia o extrato inteiro do casal só pra alimentar esse
 * Sheet quando abria.
 */
export async function buscarTransacoesDaPessoa(
  counterpartyId: string,
  periodo?: { desde?: string; ate?: string },
): Promise<BuscarTransacoesDaPessoaResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("transacoes_por_contraparte", {
    p_couple_id: session.couple.id,
    p_counterparty_id: counterpartyId,
    p_desde: periodo?.desde ?? null,
    p_ate: periodo?.ate ?? null,
  });

  if (error) return { ok: false, error: error.message, transacoes: [] };

  const transacoes = (data ?? []).map((t) => ({
    id: t.id,
    type: t.type,
    description: t.description,
    amount_primary_cents: t.amount_primary_cents,
    occurred_on: t.occurred_on,
    category_id: t.category_id,
    account_id: t.account_id,
  }));

  return { ok: true, transacoes };
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
  revalidatePath("/acerto");
  return { ok: true };
}

export async function vincularTransacaoAContraparte(
  transactionId: string,
  counterpartyId: string,
  alias: string,
): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const normalizado = normalizeDescription(alias);
  if (!normalizado) return { ok: false, error: "Digite um trecho para reconhecer." };

  const [{ data: contraparte }, { data: transacao }] = await Promise.all([
    supabase
      .from("counterparties")
      .select("id")
      .eq("id", counterpartyId)
      .eq("couple_id", session.couple.id)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("id")
      .eq("id", transactionId)
      .eq("couple_id", session.couple.id)
      .maybeSingle(),
  ]);
  if (!contraparte) return { ok: false, error: "Pessoa não encontrada." };
  if (!transacao) return { ok: false, error: "Lançamento não encontrado." };

  const { error } = await supabase
    .from("counterparty_aliases")
    .insert({ counterparty_id: counterpartyId, pattern: normalizado });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Esse apelido já está cadastrado." };
    return { ok: false, error: error.message };
  }

  revalidatePath("/pessoas");
  revalidatePath("/acerto");
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
  revalidatePath("/acerto");
  return { ok: true };
}
