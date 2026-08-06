import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { hojeISO, inicioDoMesSeguinte, primeiroDiaDoMes } from "@/lib/dates";
import type {
  Category,
  Settlement,
  SplitLedgerRow,
} from "@/lib/database.types";

import { AcertoClient } from "./acerto-client";

export const metadata = { title: "Acerto de contas · Finanças do Casal" };

export default async function AcertoPage() {
  const session = await requireSession();

  if (!session.partner) {
    return (
      <PageShell>
        <PageHeader
          titulo="Acerto de contas"
          descricao="Isso só faz sentido depois que sua esposa entrar no espaço. Convide-a em Configurações."
        />
      </PageShell>
    );
  }

  const supabase = await createClient();
  const mesAtual = primeiroDiaDoMes(hojeISO());
  const proximoMes = inicioDoMesSeguinte(mesAtual);

  const [ledgerRes, settlementsRes, categoriasRes, contasRes] = await Promise.all([
    supabase
      .from("split_ledger")
      .select("*")
      .eq("couple_id", session.couple.id),
    supabase.from("settlements").select("*").eq("couple_id", session.couple.id),
    supabase
      .from("categories")
      .select("id, name, icon")
      .eq("couple_id", session.couple.id),
    supabase
      .from("accounts")
      .select("id, name")
      .eq("couple_id", session.couple.id)
      .eq("archived", false)
      .or(`owner_profile_id.eq.${session.userId},owner_profile_id.is.null`),
  ]);

  const contas = contasRes.data ?? [];
  const idsContas = contas.map((c) => c.id);

  // Lançamentos deste mês nas contas do usuário logado (individuais +
  // conjuntas), de qualquer tipo — inclui transferência de propósito: o
  // parceiro pode ter pago o acerto via um Pix que entrou como transferência,
  // não como receita.
  const transacoesRes = idsContas.length
    ? await supabase
        .from("transactions")
        .select("id, type, description, amount_cents, occurred_on, account_id")
        .eq("couple_id", session.couple.id)
        .in("account_id", idsContas)
        .gte("occurred_on", mesAtual)
        .lt("occurred_on", proximoMes)
        .order("occurred_on", { ascending: false })
    : { data: [] };

  const settlements = (settlementsRes.data ?? []) as Settlement[];

  // Descrição da transação vinculada a cada acerto (pode ser de um mês
  // diferente do atual, então não dá pra reaproveitar `transacoesDoMes`).
  const idsTransacoesVinculadas = [
    ...new Set(settlements.map((s) => s.transaction_id).filter((id): id is string => !!id)),
  ];
  const transacoesVinculadasRes = idsTransacoesVinculadas.length
    ? await supabase
        .from("transactions")
        .select("id, description, occurred_on")
        .in("id", idsTransacoesVinculadas)
    : { data: [] };
  const transacoesVinculadas = Object.fromEntries(
    (transacoesVinculadasRes.data ?? []).map((t) => [t.id, t]),
  );

  return (
    <AcertoClient
      ledger={(ledgerRes.data ?? []) as SplitLedgerRow[]}
      settlements={settlements}
      categorias={
        (categoriasRes.data ?? []) as Pick<Category, "id" | "name" | "icon">[]
      }
      eu={session.profile}
      parceiro={session.partner.profile}
      moedaCasal={session.couple.primary_currency}
      contas={contas}
      transacoesDoMes={transacoesRes.data ?? []}
      transacoesVinculadas={transacoesVinculadas}
    />
  );
}
