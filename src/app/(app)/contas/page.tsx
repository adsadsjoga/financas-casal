import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Account, AccountBalance } from "@/lib/database.types";

import { ContasClient } from "./contas-client";

export const metadata = { title: "Contas · Finanças do Casal" };

export default async function ContasPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const [contasRes, saldosRes] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("couple_id", session.couple.id)
      .order("archived")
      .order("created_at"),
    supabase.from("account_balances").select("*").eq("couple_id", session.couple.id),
  ]);

  const saldos: Record<string, number> = {};
  for (const s of (saldosRes.data ?? []) as AccountBalance[]) {
    saldos[s.account_id] = s.balance_cents;
  }

  return (
    <ContasClient
      contas={(contasRes.data ?? []) as Account[]}
      saldos={saldos}
      membros={session.members.map((m) => ({
        profile_id: m.profile_id,
        profile: m.profile,
      }))}
    />
  );
}
