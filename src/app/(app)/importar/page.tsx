import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Account, Category } from "@/lib/database.types";

import { ImportarClient } from "./importar-client";

export const metadata = { title: "Importar · Finanças do Casal" };

export default async function ImportarPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const [contasRes, categoriasRes] = await Promise.all([
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
    <ImportarClient
      contas={(contasRes.data ?? []) as Account[]}
      categorias={(categoriasRes.data ?? []) as Category[]}
      moedaCasal={session.couple.primary_currency}
    />
  );
}
