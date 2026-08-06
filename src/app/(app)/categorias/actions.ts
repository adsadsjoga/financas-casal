"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CategoryKind } from "@/lib/database.types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface CategoriaInput {
  id?: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
}

export async function salvarCategoria(input: CategoriaInput): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const nome = input.name.trim();
  if (!nome) return { ok: false, error: "Dê um nome para a categoria." };

  const dados = {
    couple_id: session.couple.id,
    name: nome,
    kind: input.kind,
    icon: input.icon || "📦",
    color: input.color || "#64748b",
  };

  const { error } = input.id
    ? await supabase.from("categories").update(dados).eq("id", input.id)
    : await supabase.from("categories").insert(dados);

  // unique(couple_id, name, kind) — mensagem melhor que o erro cru do Postgres.
  if (error?.code === "23505") {
    return { ok: false, error: "Já existe uma categoria com esse nome nesse tipo." };
  }
  if (error) return { ok: false, error: error.message };

  revalidatePath("/categorias");
  return { ok: true };
}

/** Nunca delete físico — transações antigas continuam apontando pra categoria. */
export async function arquivarCategoria(id: string, archived: boolean): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("categories").update({ archived }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/categorias");
  return { ok: true };
}
