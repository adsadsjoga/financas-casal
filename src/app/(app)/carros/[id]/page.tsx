import { notFound } from "next/navigation";
import { PageShell } from "@/components/app/page-shell";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { transacoesDaContraparte, type TransacaoDetalhada } from "@/lib/pessoas";
import type {
  Vehicle,
  VehicleCost,
  VehicleInstallment,
  VehicleTransactionLink,
  Transaction,
  Account,
} from "@/lib/database.types";
import { CarroDetalheClient } from "./carro-detalhe-client";
export const metadata = { title: "Detalhe do carro · Finanças do Casal" };
export default async function CarroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await requireSession();
  const db = await createClient();

  const v = await db
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .eq("couple_id", s.couple.id)
    .maybeSingle();
  if (!v.data) notFound();
  const vehicle = v.data as Vehicle;

  const [c, i, l, t, a, categoriasRes, buyerRes] = await Promise.all([
    db
      .from("vehicle_costs")
      .select("*")
      .eq("vehicle_id", id)
      .order("occurred_on", { ascending: false }),
    db
      .from("vehicle_sale_installments")
      .select("*")
      .eq("vehicle_id", id)
      .order("installment_no"),
    db.from("vehicle_transaction_links").select("*").eq("vehicle_id", id),
    db
      .from("transactions")
      .select("*")
      .eq("couple_id", s.couple.id)
      .neq("type", "transferencia")
      .order("occurred_on", { ascending: false })
      .limit(80),
    db
      .from("accounts")
      .select("id,name,currency,type")
      .eq("couple_id", s.couple.id)
      .eq("archived", false),
    db.from("categories").select("id, name, icon").eq("couple_id", s.couple.id),
    // Todas as transações do comprador (qualquer conta), pra vincular em
    // lote — não os últimos 80 lançamentos do combobox acima. Só busca se o
    // carro já tem uma contraparte marcada como compradora.
    vehicle.buyer_counterparty_id
      ? Promise.all([
          db
            .from("counterparty_aliases")
            .select("counterparty_id, pattern")
            .eq("counterparty_id", vehicle.buyer_counterparty_id),
          db
            .from("transactions")
            .select("id, type, description, amount_primary_cents, occurred_on, category_id, account_id")
            .eq("couple_id", s.couple.id)
            .in("type", ["receita", "despesa"])
            .gte("occurred_on", vehicle.purchase_date),
          db
            .from("vehicle_transaction_links")
            .select("transaction_id")
            .eq("couple_id", s.couple.id),
        ])
      : null,
  ]);

  let transacoesComprador: TransacaoDetalhada[] = [];
  if (buyerRes && vehicle.buyer_counterparty_id) {
    const [aliasesRes, transacoesRes, todosVinculosRes] = buyerRes;
    const jaVinculadas = new Set(
      (todosVinculosRes.data ?? []).map((x) => x.transaction_id),
    );
    const candidatas = ((transacoesRes.data ?? []) as TransacaoDetalhada[]).filter(
      (t) => !jaVinculadas.has(t.id),
    );
    transacoesComprador = transacoesDaContraparte(
      vehicle.buyer_counterparty_id,
      candidatas,
      aliasesRes.data ?? [],
    );
  }

  const links = (l.data ?? []) as VehicleTransactionLink[];

  // Detalhe de cada vínculo (dia exato, descrição, categoria) — os últimos
  // 80 lançamentos buscados acima (pro combobox de vincular manual) podem
  // não cobrir um vínculo antigo, então busca as transações vinculadas à
  // parte, por id.
  const idsVinculados = [...new Set(links.map((x) => x.transaction_id))];
  const vinculadasRes = idsVinculados.length
    ? await db
        .from("transactions")
        .select("id, occurred_on, description, category_id, amount_primary_cents, type")
        .in("id", idsVinculados)
    : { data: [] };
  const transacoesVinculadas = (vinculadasRes.data ?? []) as Array<{
    id: string;
    occurred_on: string;
    description: string;
    category_id: string | null;
    amount_primary_cents: number;
    type: string;
  }>;

  return (
    <PageShell largura="painel">
      <CarroDetalheClient
        vehicle={vehicle}
        costs={(c.data ?? []) as VehicleCost[]}
        installments={(i.data ?? []) as VehicleInstallment[]}
        links={links}
        transactions={(t.data ?? []) as Transaction[]}
        transacoesVinculadas={transacoesVinculadas}
        accounts={(a.data ?? []) as Pick<Account, "id" | "name" | "currency" | "type">[]}
        categorias={(categoriasRes.data ?? []) as Array<{ id: string; name: string; icon: string }>}
        transacoesComprador={transacoesComprador}
        moeda={s.couple.primary_currency}
      />
    </PageShell>
  );
}
