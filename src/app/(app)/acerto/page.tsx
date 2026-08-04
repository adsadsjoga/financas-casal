import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import type {
  Category,
  Settlement,
  SplitLedgerRow,
} from "@/lib/database.types";

import { AcertoClient } from "./acerto-client";

export const metadata = { title: "Acerto de contas · Finanças do Casal" };

export default async function AcertoPage() {
  const session = await requireSession();

  if (!session.partner) {
    return (
      <PageShell>
        <PageHeader
          titulo="Acerto de contas"
          descricao="Isso só faz sentido depois que sua esposa entrar no espaço. Convide-a em Configurações."
        />
      </PageShell>
    );
  }

  const supabase = await createClient();
  const [ledgerRes, settlementsRes, categoriasRes] = await Promise.all([
    supabase
      .from("split_ledger")
      .select("*")
      .eq("couple_id", session.couple.id),
    supabase.from("settlements").select("*").eq("couple_id", session.couple.id),
    supabase
      .from("categories")
      .select("id, name, icon")
      .eq("couple_id", session.couple.id),
  ]);

  return (
    <AcertoClient
      ledger={(ledgerRes.data ?? []) as SplitLedgerRow[]}
      settlements={(settlementsRes.data ?? []) as Settlement[]}
      categorias={
        (categoriasRes.data ?? []) as Pick<Category, "id" | "name" | "icon">[]
      }
      eu={session.profile}
      parceiro={session.partner.profile}
      moedaCasal={session.couple.primary_currency}
    />
  );
}
