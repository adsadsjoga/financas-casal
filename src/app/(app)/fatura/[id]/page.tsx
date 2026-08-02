import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Account, AccountBalance, Category, Transaction } from "@/lib/database.types";

import { FaturaClient } from "./fatura-client";

export const metadata = { title: "Fatura · Finanças do Casal" };

export default async function FaturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const { id } = await params;

  const { data: cartaoData } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .eq("couple_id", session.couple.id)
    .eq("type", "cartao")
    .maybeSingle();

  if (!cartaoData) notFound();
  const cartao = cartaoData as Account;

  const [transacoesRes, saldoRes, contasBancoRes, categoriasRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("account_id", cartao.id)
      .order("invoice_month", { ascending: true })
      .order("occurred_on", { ascending: true }),
    supabase
      .from("account_balances")
      .select("*")
      .eq("account_id", cartao.id)
      .maybeSingle(),
    supabase
      .from("accounts")
      .select("*")
      .eq("couple_id", session.couple.id)
      .eq("archived", false)
      .neq("type", "cartao")
      .order("created_at"),
    supabase
      .from("categories")
      .select("*")
      .eq("couple_id", session.couple.id)
      .eq("archived", false)
      .order("kind")
      .order("name"),
  ]);

  return (
    <FaturaClient
      cartao={cartao}
      transacoes={(transacoesRes.data ?? []) as Transaction[]}
      saldoAtual={(saldoRes.data as AccountBalance | null)?.balance_cents ?? cartao.initial_balance_cents}
      contasPagamento={(contasBancoRes.data ?? []) as Account[]}
      categorias={(categoriasRes.data ?? []) as Category[]}
      moedaCasal={session.couple.primary_currency}
    />
  );
}
