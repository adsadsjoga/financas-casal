import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hojeISO, inicioDoMesSeguinte, primeiroDiaDoMes } from "@/lib/dates";
import type { Account, AccountBalance, Category, Recurrence } from "@/lib/database.types";

import { FixasClient } from "./fixas-client";

export const metadata = { title: "Contas fixas · Finanças do Casal" };

export default async function FixasPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const hoje = hojeISO();
  const mesAtual = primeiroDiaDoMes(hoje);
  const proximoMes = inicioDoMesSeguinte(mesAtual);

  const [recorrenciasRes, saldosRes, contasRes, categoriasRes, lancadasRes] = await Promise.all([
    supabase
      .from("recurrences")
      .select("*")
      .eq("couple_id", session.couple.id)
      .order("day_of_month"),
    supabase.from("account_balances").select("*").eq("couple_id", session.couple.id),
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
    supabase
      .from("transactions")
      .select("recurrence_id")
      .eq("couple_id", session.couple.id)
      .not("recurrence_id", "is", null)
      .gte("occurred_on", mesAtual)
      .lt("occurred_on", proximoMes),
  ]);

  if (saldosRes.error) {
    console.error("Erro ao carregar account_balances em fixas:", saldosRes.error);
  }

  const contas = (contasRes.data ?? []) as Account[];
  const patrimonio = contas.reduce((acc, c) => {
    const saldo = (saldosRes.data as AccountBalance[] | null)?.find(
      (s) => s.account_id === c.id,
    );
    return acc + (saldo?.balance_primary_cents ?? 0);
  }, 0);

  const idsLancados = new Set(
    (lancadasRes.data ?? [])
      .map((t) => t.recurrence_id)
      .filter((id): id is string => !!id),
  );

  return (
    <FixasClient
      recorrencias={(recorrenciasRes.data ?? []) as Recurrence[]}
      idsLancadosEsteMes={[...idsLancados]}
      patrimonioAtual={patrimonio}
      contas={contas}
      categorias={(categoriasRes.data ?? []) as Category[]}
      mesAtual={mesAtual}
      hoje={hoje}
      moedaCasal={session.couple.primary_currency}
    />
  );
}
