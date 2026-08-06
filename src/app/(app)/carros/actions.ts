"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseBRL } from "@/lib/money";
import { hojeISO } from "@/lib/dates";
import type { VehicleStatus } from "@/lib/database.types";

export type CarroAction = { ok: boolean; error?: string; id?: string };
function cents(value: string, label: string) {
  const n = parseBRL(value);
  return n === null || n <= 0 ? { error: label + " inválido." } : { value: n };
}

export async function salvarCarro(input: {
  id?: string;
  make: string;
  model: string;
  year: string;
  color: string;
  mileage: string;
  plate: string;
  purchasePrice: string;
  purchaseDate: string;
  desiredSalePrice: string;
  buyerName: string;
  buyerCounterpartyId?: string | null;
  salePrice: string;
  saleDate: string;
  notes: string;
}): Promise<CarroAction> {
  const session = await requireSession();
  const supabase = await createClient();
  const make = input.make.trim(),
    model = input.model.trim();
  if (!make || !model) return { ok: false, error: "Informe marca e modelo." };
  const purchase = cents(input.purchasePrice, "Preço de compra");
  if ("error" in purchase) return { ok: false, error: purchase.error };
  const sale = input.salePrice.trim()
    ? cents(input.salePrice, "Preço de venda")
    : { value: null };
  if ("error" in sale) return { ok: false, error: sale.error };
  const desired = input.desiredSalePrice.trim()
    ? cents(input.desiredSalePrice, "Preço desejado")
    : { value: null };
  if ("error" in desired) return { ok: false, error: desired.error };
  const year = input.year.trim() ? Number(input.year) : null,
    mileage = input.mileage.trim() ? Number(input.mileage) : null;
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2200))
    return { ok: false, error: "Ano inválido." };
  if (mileage !== null && (!Number.isInteger(mileage) || mileage < 0))
    return { ok: false, error: "Quilometragem inválida." };
  const vendido = sale.value !== null;
  if (vendido && !input.saleDate)
    return { ok: false, error: "Informe a data da venda." };
  const payload = {
    couple_id: session.couple.id,
    status: (vendido ? "vendido" : "estoque") as VehicleStatus,
    make,
    model,
    year,
    color: input.color.trim(),
    mileage,
    plate: input.plate.trim().toUpperCase(),
    purchase_price_cents: purchase.value!,
    purchase_date: input.purchaseDate || hojeISO(),
    desired_sale_price_cents: desired.value,
    sale_price_cents: sale.value,
    sale_date: vendido ? input.saleDate : null,
    buyer_name: input.buyerName.trim(),
    buyer_counterparty_id: input.buyerCounterpartyId ?? null,
    notes: input.notes.trim(),
  };
  const result = input.id
    ? await supabase
        .from("vehicles")
        .update(payload)
        .eq("id", input.id)
        .select("id")
        .single()
    : await supabase.from("vehicles").insert(payload).select("id").single();
  if (result.error) return { ok: false, error: result.error.message };
  revalidatePath("/carros");
  revalidatePath("/carros/" + result.data.id);
  return { ok: true, id: result.data.id };
}

/**
 * Define ou troca o comprador de um carro JÁ EXISTENTE. `salvarCarro` também
 * grava `buyer_counterparty_id`, mas exige o payload inteiro do veículo — só
 * usado hoje na criação (`/carros/novo`). Esta action é o caminho que
 * faltava pra corrigir o vínculo depois, direto da página do carro.
 */
export async function atualizarCompradorCarro(input: {
  vehicleId: string;
  buyerName: string;
  buyerCounterpartyId: string | null;
}): Promise<CarroAction> {
  const session = await requireSession();
  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicles")
    .update({
      buyer_name: input.buyerName.trim(),
      buyer_counterparty_id: input.buyerCounterpartyId,
    })
    .eq("id", input.vehicleId)
    .eq("couple_id", session.couple.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/carros");
  revalidatePath("/carros/" + input.vehicleId);
  return { ok: true };
}

export async function adicionarCustoCarro(input: {
  vehicleId: string;
  category: string;
  description: string;
  amount: string;
  occurredOn: string;
}): Promise<CarroAction> {
  const session = await requireSession();
  const value = cents(input.amount, "Valor do custo");
  if ("error" in value) return { ok: false, error: value.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicle_costs")
    .insert({
      couple_id: session.couple.id,
      vehicle_id: input.vehicleId,
      category: input.category.trim() || "Outro",
      description: input.description.trim(),
      amount_cents: value.value!,
      occurred_on: input.occurredOn || hojeISO(),
    });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/carros");
  revalidatePath("/carros/" + input.vehicleId);
  return { ok: true };
}

export async function vincularLancamento(input: {
  vehicleId: string;
  transactionId: string;
  role: "compra" | "custo" | "entrada" | "parcela" | "ajuste";
}): Promise<CarroAction> {
  const session = await requireSession();
  const supabase = await createClient();
  const { data: tx } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", input.transactionId)
    .eq("couple_id", session.couple.id)
    .maybeSingle();
  if (!tx) return { ok: false, error: "Lançamento não encontrado no casal." };
  const { error } = await supabase
    .from("vehicle_transaction_links")
    .insert({
      couple_id: session.couple.id,
      vehicle_id: input.vehicleId,
      transaction_id: input.transactionId,
      role: input.role,
    });
  if (error)
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "Esse lançamento já está vinculado."
          : error.message,
    };
  revalidatePath("/carros");
  revalidatePath("/carros/" + input.vehicleId);
  revalidatePath("/transacoes");
  return { ok: true };
}

export interface TransacaoBuscaCarro {
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
 * a este carro — o combobox "Escolher lançamento" só lista os 80 mais
 * recentes e exclui transferência, então um pagamento antigo ou uma
 * transferência entre contas nunca aparecia lá pra vincular.
 */
export async function buscarTransacoesParaVincularCarro(
  vehicleId: string,
  termo: string,
): Promise<TransacaoBuscaCarro[]> {
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
    supabase
      .from("vehicle_transaction_links")
      .select("transaction_id")
      .eq("vehicle_id", vehicleId),
  ]);

  const jaVinculadas = new Set((vinculadas ?? []).map((v) => v.transaction_id));
  return (transacoes ?? []).filter((t) => !jaVinculadas.has(t.id));
}

export async function criarContaDinheiro(): Promise<CarroAction> {
  const session = await requireSession();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("accounts")
    .select("id")
    .eq("couple_id", session.couple.id)
    .eq("type", "dinheiro")
    .eq("name", "Dinheiro em mãos")
    .eq("archived", false)
    .maybeSingle();
  if (existing) return { ok: true, id: existing.id };
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      couple_id: session.couple.id,
      name: "Dinheiro em mãos",
      type: "dinheiro",
      currency: session.couple.primary_currency,
      initial_balance_cents: 0,
      color: "#f39c12",
      is_private: false,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/contas");
  revalidatePath("/carros");
  revalidatePath("/");
  return { ok: true, id: data.id };
}
