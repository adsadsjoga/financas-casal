import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Settlement, SplitLedgerRow } from "@/lib/database.types";

import { AcertoClient } from "./acerto-client";

export const metadata = { title: "Acerto de contas · Finanças do Casal" };

export default async function AcertoPage() {
  const session = await requireSession();

  if (!session.partner) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Acerto de contas</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Isso só faz sentido depois que sua esposa entrar no espaço. Convide-a
          em Configurações.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const [ledgerRes, settlementsRes] = await Promise.all([
    supabase
      .from("split_ledger")
      .select("*")
      .eq("couple_id", session.couple.id),
    supabase
      .from("settlements")
      .select("*")
      .eq("couple_id", session.couple.id),
  ]);

  return (
    <AcertoClient
      ledger={(ledgerRes.data ?? []) as SplitLedgerRow[]}
      settlements={(settlementsRes.data ?? []) as Settlement[]}
      eu={session.profile}
      parceiro={session.partner.profile}
      moedaCasal={session.couple.primary_currency}
    />
  );
}
