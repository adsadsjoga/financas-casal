"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function criarCasal(nome: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_couple", { p_name: nome });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function entrarNoCasal(codigo: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_couple", { p_code: codigo });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
