import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Goal, GoalContribution } from "@/lib/database.types";

import { MetasClient } from "./metas-client";

export const metadata = { title: "Metas · Finanças do Casal" };

export default async function MetasPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: metas } = await supabase
    .from("goals")
    .select("*")
    .eq("couple_id", session.couple.id)
    .eq("archived", false)
    .order("created_at");

  const metaIds = (metas ?? []).map((m) => m.id);

  const { data: aportes } = metaIds.length
    ? await supabase.from("goal_contributions").select("*").in("goal_id", metaIds)
    : { data: [] as GoalContribution[] };

  return (
    <MetasClient
      metas={(metas ?? []) as Goal[]}
      aportes={(aportes ?? []) as GoalContribution[]}
      membros={session.members.map((m) => ({
        profile_id: m.profile_id,
        profile: m.profile,
      }))}
      usuarioId={session.userId}
      moedaCasal={session.couple.primary_currency}
    />
  );
}
