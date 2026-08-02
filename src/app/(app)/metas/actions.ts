"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseBRL } from "@/lib/money";
import { hojeISO } from "@/lib/dates";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface MetaInput {
  id?: string;
  name: string;
  target: string;
  deadline?: string;
  icon: string;
  color: string;
}

export async function salvarMeta(input: MetaInput): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const nome = input.name.trim();
  if (!nome) return { ok: false, error: "Dê um nome para a meta." };

  const target = parseBRL(input.target);
  if (target === null || target <= 0) {
    return { ok: false, error: "Valor da meta inválido." };
  }

  const dados = {
    couple_id: session.couple.id,
    name: nome,
    target_cents: target,
    deadline: input.deadline?.trim() || null,
    icon: input.icon || "🎯",
    color: input.color || "#f39c12",
  };

  const { error } = input.id
    ? await supabase.from("goals").update(dados).eq("id", input.id)
    : await supabase.from("goals").insert(dados);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/metas");
  return { ok: true };
}

export async function arquivarMeta(id: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("goals").update({ archived: true }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/metas");
  return { ok: true };
}

export async function alternarConcluida(id: string, completed: boolean): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("goals").update({ completed }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/metas");
  return { ok: true };
}

export interface AporteInput {
  goal_id: string;
  profile_id: string;
  valor: string;
  occurred_on?: string;
  note?: string;
}

export async function registrarAporte(input: AporteInput): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const valor = parseBRL(input.valor);
  if (valor === null || valor === 0) return { ok: false, error: "Valor inválido." };

  const { error } = await supabase.from("goal_contributions").insert({
    goal_id: input.goal_id,
    profile_id: input.profile_id,
    amount_cents: valor,
    occurred_on: input.occurred_on?.trim() || hojeISO(),
    note: input.note?.trim() ?? "",
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/metas");
  return { ok: true };
}

export async function excluirAporte(id: string): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase.from("goal_contributions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/metas");
  return { ok: true };
}
