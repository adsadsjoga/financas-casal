import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Couple, CoupleMember, Profile } from "@/lib/database.types";

export interface Session {
  userId: string;
  profile: Profile;
  couple: Couple;
  /** Sempre com o usuário atual primeiro. */
  members: Array<CoupleMember & { profile: Profile }>;
  me: CoupleMember & { profile: Profile };
  partner: (CoupleMember & { profile: Profile }) | null;
}

/**
 * Carrega usuário + casal para uma página protegida.
 * Sem sessão manda para /login; com sessão mas sem casal manda para /onboarding.
 */
export async function requireSession(): Promise<Session> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("couple_members")
    .select("*, couple:couples(*)")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!membership?.couple) redirect("/onboarding");

  const couple = membership.couple as unknown as Couple;

  const { data: rows } = await supabase
    .from("couple_members")
    .select("*, profile:profiles(*)")
    .eq("couple_id", couple.id);

  const members = ((rows ?? []) as unknown as Array<
    CoupleMember & { profile: Profile }
  >).sort((a, b) =>
    a.profile_id === user.id ? -1 : b.profile_id === user.id ? 1 : 0,
  );

  const me = members.find((m) => m.profile_id === user.id);
  if (!me) redirect("/onboarding");

  return {
    userId: user.id,
    profile: me.profile,
    couple,
    members,
    me,
    partner: members.find((m) => m.profile_id !== user.id) ?? null,
  };
}

/** Só o usuário, sem exigir casal — usado no /onboarding. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}
