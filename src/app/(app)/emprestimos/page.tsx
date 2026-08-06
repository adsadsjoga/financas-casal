import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resumoEmprestimo } from "@/lib/emprestimos";
import type { Account, Loan, LoanTransactionLink, Transaction } from "@/lib/database.types";

import { EmprestimosClient } from "./emprestimos-client";

export const metadata = { title: "Empréstimos · Finanças do Casal" };

export default async function EmprestimosPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const [loansRes, linksRes, contrapartesRes, accountsRes] = await Promise.all([
    supabase
      .from("loans")
      .select("*")
      .eq("couple_id", session.couple.id)
      .order("occurred_on", { ascending: false }),
    supabase.from("loan_transaction_links").select("*").eq("couple_id", session.couple.id),
    supabase
      .from("counterparties")
      .select("id, name")
      .eq("couple_id", session.couple.id)
      .eq("archived", false)
      .order("name"),
    supabase
      .from("accounts")
      .select("id, name, currency, type")
      .eq("couple_id", session.couple.id)
      .eq("archived", false),
  ]);

  const loans = (loansRes.data ?? []) as Loan[];
  const links = (linksRes.data ?? []) as LoanTransactionLink[];
  const accounts = (accountsRes.data ?? []) as Pick<
    Account,
    "id" | "name" | "currency" | "type"
  >[];

  const idsTransacoes = [...new Set(links.map((l) => l.transaction_id))];
  const transacoesRes = idsTransacoes.length
    ? await supabase
        .from("transactions")
        .select("id, type, amount_primary_cents, account_id")
        .in("id", idsTransacoes)
    : { data: [] };
  const transacoes = (transacoesRes.data ?? []) as Pick<
    Transaction,
    "id" | "type" | "amount_primary_cents" | "account_id"
  >[];
  const transacoesPorId = new Map(transacoes.map((t) => [t.id, t]));
  const contasPorId = new Map(accounts.map((a) => [a.id, a]));

  const resumos = new Map(
    loans.map((loan) => [
      loan.id,
      resumoEmprestimo(
        loan,
        links.filter((l) => l.loan_id === loan.id),
        transacoesPorId,
        contasPorId,
      ),
    ]),
  );

  return (
    <EmprestimosClient
      loans={loans}
      resumos={Object.fromEntries(resumos)}
      contrapartes={contrapartesRes.data ?? []}
      moeda={session.couple.primary_currency}
    />
  );
}
