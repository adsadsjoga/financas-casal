import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDias, hojeISO } from "@/lib/dates";
import type { Goal, GoalContribution } from "@/lib/database.types";
import type { TransacaoParaSugestao } from "@/lib/splits";

import { MetasClient } from "./metas-client";

export const metadata = { title: "Metas · Finanças do Casal" };

export default async function MetasPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const [{ data: metas }, { data: contas }] = await Promise.all([
    supabase
      .from("goals")
      .select("*")
      .eq("couple_id", session.couple.id)
      .eq("archived", false)
      .order("created_at"),
    supabase
      .from("accounts")
      .select("id, name")
      .eq("couple_id", session.couple.id)
      .eq("archived", false),
  ]);

  const metaIds = (metas ?? []).map((m) => m.id);
  const idsContas = (contas ?? []).map((c) => c.id);

  const [{ data: aportes }, { data: transacoesRecentes }] = await Promise.all([
    metaIds.length
      ? supabase.from("goal_contributions").select("*").in("goal_id", metaIds)
      : Promise.resolve({ data: [] as GoalContribution[] }),
    // Janela de 90 dias: um aporte pode referenciar um lançamento de algumas
    // semanas atrás, não só do mês corrente (diferente do /acerto, que só
    // sugere o mês porque é isso que o saldo do casal olha).
    idsContas.length
      ? supabase
          .from("transactions")
          .select("id, type, description, amount_cents, occurred_on, account_id")
          .eq("couple_id", session.couple.id)
          .in("account_id", idsContas)
          .gte("occurred_on", addDias(hojeISO(), -90))
          .order("occurred_on", { ascending: false })
      : Promise.resolve({ data: [] as TransacaoParaSugestao[] }),
  ]);

  // Descrição/data das transações já vinculadas a algum aporte -- pode ser
  // de fora da janela de 90 dias acima, então busca separado.
  const idsTransacoesVinculadas = [
    ...new Set(
      (aportes ?? [])
        .map((a) => a.transaction_id)
        .filter((id): id is string => !!id),
    ),
  ];
  const { data: transacoesVinculadasData } = idsTransacoesVinculadas.length
    ? await supabase
        .from("transactions")
        .select("id, description, occurred_on")
        .in("id", idsTransacoesVinculadas)
    : { data: [] };
  const transacoesVinculadas = Object.fromEntries(
    (transacoesVinculadasData ?? []).map((t) => [t.id, t]),
  );

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
      contas={contas ?? []}
      transacoesRecentes={(transacoesRecentes ?? []) as TransacaoParaSugestao[]}
      transacoesVinculadas={transacoesVinculadas}
    />
  );
}
