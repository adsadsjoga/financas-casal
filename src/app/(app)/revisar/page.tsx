import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category, Transaction } from "@/lib/database.types";

import { RevisarClient } from "./revisar-client";

export const metadata = { title: "Revisar · Finanças do Casal" };

export default async function RevisarPage({
  searchParams,
}: {
  searchParams: Promise<{ pessoa?: string; busca?: string }>;
}) {
  const session = await requireSession();
  const supabase = await createClient();
  const params = await searchParams;

  const filtroPessoa = params.pessoa ?? "";
  const busca = (params.busca ?? "").trim();

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("couple_id", session.couple.id)
    .eq("needs_review", true)
    .order("occurred_on", { ascending: false });

  if (filtroPessoa) query = query.eq("payer_profile_id", filtroPessoa);
  if (busca) query = query.ilike("description", `%${busca}%`);

  const [transacoesRes, contasRes, categoriasRes] = await Promise.all([
    query,
    supabase
      .from("accounts")
      .select("*")
      .eq("couple_id", session.couple.id)
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
    <RevisarClient
      transacoes={(transacoesRes.data ?? []) as Transaction[]}
      contas={(contasRes.data ?? []) as Account[]}
      categorias={(categoriasRes.data ?? []) as Category[]}
      membros={session.members.map((m) => ({
        profile_id: m.profile_id,
        profile: m.profile,
      }))}
      filtroPessoa={filtroPessoa}
      busca={busca}
      moedaCasal={session.couple.primary_currency}
    />
  );
}
