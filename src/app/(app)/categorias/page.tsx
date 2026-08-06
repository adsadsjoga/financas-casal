import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/database.types";

import { CategoriasClient } from "./categorias-client";

export const metadata = { title: "Categorias · Finanças do Casal" };

export default async function CategoriasPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("couple_id", session.couple.id)
    .order("kind")
    .order("name");

  return <CategoriasClient categorias={(data ?? []) as Category[]} />;
}
