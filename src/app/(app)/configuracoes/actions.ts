"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseBRL } from "@/lib/money";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function salvarPerfil(
  nome: string,
  emoji: string,
  renda: string,
): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const displayName = nome.trim();
  if (!displayName) return { ok: false, error: "Coloque um nome." };

  const rendaCents = renda.trim() === "" ? 0 : parseBRL(renda);
  if (rendaCents === null || rendaCents < 0) {
    return { ok: false, error: "Renda inválida." };
  }

  const { error: erroPerfil } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      avatar_emoji: emoji.trim() || "🙂",
    })
    .eq("id", session.userId);

  if (erroPerfil) return { ok: false, error: erroPerfil.message };

  const { error: erroMembro } = await supabase
    .from("couple_members")
    .update({ income_cents: rendaCents })
    .eq("couple_id", session.couple.id)
    .eq("profile_id", session.userId);

  if (erroMembro) return { ok: false, error: erroMembro.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function salvarCasal(nome: string): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const novoNome = nome.trim();
  if (!novoNome) return { ok: false, error: "Coloque um nome." };

  const { error } = await supabase
    .from("couples")
    .update({ name: novoNome })
    .eq("id", session.couple.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
