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
