import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hojeISO, inicioDoMesSeguinte, primeiroDiaDoMes } from "@/lib/dates";
import type { Account, Category, Transaction } from "@/lib/database.types";

import { TransacoesClient } from "./transacoes-client";

export const metadata = { title: "Transações · Finanças do Casal" };

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; conta?: string }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const params = await searchParams;

  const mes = /^\d{4}-\d{2}-\d{2}$/.test(params.mes ?? "")
    ? primeiroDiaDoMes(params.mes!)
    : primeiroDiaDoMes(hojeISO());
  const proximoMes = inicioDoMesSeguinte(mes);
  const filtroConta = params.conta ?? "";

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("couple_id", session.couple.id)
    .gte("occurred_on", mes)
    .lt("occurred_on", proximoMes)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (filtroConta) query = query.eq("account_id", filtroConta);

  const [transacoesRes, contasRes, categoriasRes] = await Promise.all([
    query,
    supabase
      .from("accounts")
      .select("*")
      .eq("couple_id", session.couple.id)
      .eq("archived", false)
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
    <TransacoesClient
      transacoes={(transacoesRes.data ?? []) as Transaction[]}
      contas={(contasRes.data ?? []) as Account[]}
      categorias={(categoriasRes.data ?? []) as Category[]}
      membros={session.members.map((m) => ({
        profile_id: m.profile_id,
        income_cents: m.income_cents,
        profile: m.profile,
      }))}
      usuarioId={session.userId}
      mes={mes}
      filtroConta={filtroConta}
    />
  );
}
