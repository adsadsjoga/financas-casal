import { notFound } from "next/navigation";
import { PageShell } from "@/components/app/page-shell";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addMeses, hojeISO } from "@/lib/dates";
import type { Account, Loan, LoanTransactionLink } from "@/lib/database.types";

import { EmprestimoDetalheClient } from "./emprestimo-detalhe-client";

export const metadata = { title: "Detalhe do empréstimo · Finanças do Casal" };

export default async function EmprestimoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const db = await createClient();

  const l = await db
    .from("loans")
    .select("*")
    .eq("id", id)
    .eq("couple_id", session.couple.id)
    .maybeSingle();
  if (!l.data) notFound();
  const loan = l.data as Loan;

  const [linksRes, transactionsRes, accountsRes, categoriasRes, contrapartesRes] =
    await Promise.all([
      db.from("loan_transaction_links").select("*").eq("loan_id", id),
      // Últimos 2 meses no combobox rápido — igual Carros; um lançamento mais
      // antigo se busca por texto.
      db
        .from("transactions")
        .select("*")
        .eq("couple_id", session.couple.id)
        .gte("occurred_on", addMeses(hojeISO(), -2))
        .order("occurred_on", { ascending: false }),
      db
        .from("accounts")
        .select("id,name,currency,type")
        .eq("couple_id", session.couple.id)
        .eq("archived", false),
      db.from("categories").select("id, name, icon").eq("couple_id", session.couple.id),
      db
        .from("counterparties")
        .select("id, name")
        .eq("couple_id", session.couple.id)
        .eq("archived", false)
        .order("name"),
    ]);

  const links = (linksRes.data ?? []) as LoanTransactionLink[];

  const idsVinculados = [...new Set(links.map((x) => x.transaction_id))];
  const vinculadasRes = idsVinculados.length
    ? await db
        .from("transactions")
        .select("id, occurred_on, description, category_id, amount_primary_cents, type, account_id")
        .in("id", idsVinculados)
    : { data: [] };
  const transacoesVinculadas = (vinculadasRes.data ?? []) as Array<{
    id: string;
    occurred_on: string;
    description: string;
    category_id: string | null;
    amount_primary_cents: number;
    type: string;
    account_id: string;
  }>;

  return (
    <PageShell largura="painel">
      <EmprestimoDetalheClient
        loan={loan}
        links={links}
        transactions={transactionsRes.data ?? []}
        transacoesVinculadas={transacoesVinculadas}
        accounts={(accountsRes.data ?? []) as Pick<Account, "id" | "name" | "currency" | "type">[]}
        categorias={(categoriasRes.data ?? []) as Array<{ id: string; name: string; icon: string }>}
        contrapartes={(contrapartesRes.data ?? []) as Array<{ id: string; name: string }>}
        moeda={session.couple.primary_currency}
      />
    </PageShell>
  );
}
