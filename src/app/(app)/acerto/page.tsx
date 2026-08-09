import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { hojeISO, inicioDoMesSeguinte, primeiroDiaDoMes } from "@/lib/dates";
import { resolverPeriodo } from "@/lib/periodo";
import type {
  Category,
  Settlement,
  SettlementItem,
  SplitLedgerRow,
} from "@/lib/database.types";

import { AcertoClient } from "./acerto-client";

export const metadata = { title: "Acerto de contas · Finanças do Casal" };

export default async function AcertoPage({
  searchParams,
}: {
  searchParams: Promise<{
    modo?: string;
    mes?: string;
    ano?: string;
    dia?: string;
  }>;
}) {
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
  const params = await searchParams;
  const periodo = resolverPeriodo(params);

  const mesAtual = primeiroDiaDoMes(hojeISO());
  const proximoMes = inicioDoMesSeguinte(mesAtual);

  const [
    ledgerRes,
    ledgerPeriodoRes,
    settlementsRes,
    settlementItemsRes,
    categoriasRes,
    contasRes,
    vehicleLinksRes,
  ] = await Promise.all([
      // Sem filtro de data -- usado no saldo agregado do topo e em "De onde
      // vem essa diferença", que sempre olham o histórico inteiro do casal,
      // independente do período selecionado na tabela abaixo.
      supabase.from("split_ledger").select("*").eq("couple_id", session.couple.id),
      // Só a janela do período escolhido -- usado na tabela "Lançamentos
      // divididos".
      supabase
        .from("split_ledger")
        .select("*")
        .eq("couple_id", session.couple.id)
        .gte("occurred_on", periodo.de)
        .lt("occurred_on", periodo.ateExclusivo),
      supabase.from("settlements").select("*").eq("couple_id", session.couple.id),
      // Junta com `settlements` pra saber de/pra quem e qual transferência
      // pagou cada item -- é o que decide o status (Pago/Parcial/Em aberto)
      // de cada despesa dividida na tabela nova.
      supabase
        .from("settlement_items")
        .select("*, settlement:settlements(from_profile, to_profile, transaction_id)")
        .eq("couple_id", session.couple.id),
      supabase
        .from("categories")
        .select("id, name, icon")
        .eq("couple_id", session.couple.id),
      // Sem filtro de owner: candidato a "vincular pagamento" pode ser uma
      // transferência de qualquer um dos dois -- a RLS já esconde o que o
      // usuário logado não pode ver (ex. conta privada do parceiro).
      // `owner_profile_id` vem junto pra dar pra filtrar a Coluna B por
      // pessoa (Gabriel/Joana/conjunta), não só por nome de conta.
      supabase
        .from("accounts")
        .select("id, name, owner_profile_id")
        .eq("couple_id", session.couple.id)
        .eq("archived", false),
      // Carro é negócio, não gasto/pagamento pessoal do casal -- mesma
      // exclusão que a Home e /orcamentos já aplicam.
      supabase
        .from("vehicle_transaction_links")
        .select("transaction_id")
        .eq("couple_id", session.couple.id),
    ]);

  const contas = contasRes.data ?? [];
  const idsContas = contas.map((c) => c.id);
  const ledger = (ledgerRes.data ?? []) as SplitLedgerRow[];
  const ledgerPeriodo = (ledgerPeriodoRes.data ?? []) as SplitLedgerRow[];
  const settlements = (settlementsRes.data ?? []) as Settlement[];
  const carrosTransactionIds = [
    ...new Set((vehicleLinksRes.data ?? []).map((l) => l.transaction_id)),
  ];

  const COLUNAS_TRANSACAO =
    "id, type, description, amount_cents, occurred_on, account_id, category_id, transfer_account_id";

  // Lançamentos deste mês, de qualquer conta visível, de qualquer tipo —
  // usados nas duas telas de sugestão: o "Marcar como acertado" avulso
  // (sempre olha o mês corrente) e "Vincular pagamento" por despesa (quando
  // a despesa cai no mês corrente). `category_id`/`transfer_account_id`
  // vêm junto pra dar pra excluir Investimentos e transferência interna de
  // uma pessoa só na Coluna B.
  const transacoesDoMesRes = idsContas.length
    ? await supabase
        .from("transactions")
        .select(COLUNAS_TRANSACAO)
        .eq("couple_id", session.couple.id)
        .in("account_id", idsContas)
        .gte("occurred_on", mesAtual)
        .lt("occurred_on", proximoMes)
        .order("occurred_on", { ascending: false })
    : { data: [] };

  // Mesma busca, mas na janela do período escolhido no seletor -- pra
  // "Vincular pagamento" sugerir candidatos certos quando o usuário está
  // olhando um mês/ano diferente do atual.
  const transacoesDoPeriodoRes =
    idsContas.length && (periodo.de !== mesAtual || periodo.ateExclusivo !== proximoMes)
      ? await supabase
          .from("transactions")
          .select(COLUNAS_TRANSACAO)
          .eq("couple_id", session.couple.id)
          .in("account_id", idsContas)
          .gte("occurred_on", periodo.de)
          .lt("occurred_on", periodo.ateExclusivo)
          .order("occurred_on", { ascending: false })
      : transacoesDoMesRes;

  // TODAS as despesas do período (não só as que já têm split) -- popula a
  // Coluna A do card "Lançamentos divididos", pra dar pra vincular um
  // pagamento numa despesa que ainda nem foi marcada como dividida.
  const despesasDoPeriodoRes = idsContas.length
    ? await supabase
        .from("transactions")
        .select(
          "id, description, amount_cents, occurred_on, category_id, payer_profile_id, split_mode, account_id",
        )
        .eq("couple_id", session.couple.id)
        .eq("type", "despesa")
        .in("account_id", idsContas)
        .gte("occurred_on", periodo.de)
        .lt("occurred_on", periodo.ateExclusivo)
        .order("occurred_on", { ascending: false })
    : { data: [] };

  // Descrição da transação vinculada a cada acerto avulso (pode ser de um
  // mês diferente do período em exibição).
  const idsTransacoesVinculadas = [
    ...new Set(settlements.map((s) => s.transaction_id).filter((id): id is string => !!id)),
  ];
  // Descrição de cada despesa dividida do período, pra mostrar na tabela
  // "Lançamentos divididos" sem depender do split_ledger (que não expõe
  // descrição nem conta).
  const idsDespesasDivididas = [...new Set(ledgerPeriodo.map((l) => l.transaction_id))];
  const idsTransacoesParaBuscar = [
    ...new Set([...idsTransacoesVinculadas, ...idsDespesasDivididas]),
  ];
  const transacoesBuscadasRes = idsTransacoesParaBuscar.length
    ? await supabase
        .from("transactions")
        .select("id, description, occurred_on, account_id")
        .in("id", idsTransacoesParaBuscar)
    : { data: [] };
  const transacoesPorId = Object.fromEntries(
    (transacoesBuscadasRes.data ?? []).map((t) => [t.id, t]),
  );

  return (
    <AcertoClient
      ledger={ledger}
      ledgerPeriodo={ledgerPeriodo}
      settlements={settlements}
      settlementItems={
        (settlementItemsRes.data ?? []) as unknown as Array<
          SettlementItem & {
            settlement: Pick<Settlement, "from_profile" | "to_profile" | "transaction_id"> | null;
          }
        >
      }
      categorias={
        (categoriasRes.data ?? []) as Pick<Category, "id" | "name" | "icon">[]
      }
      eu={session.profile}
      parceiro={session.partner.profile}
      moedaCasal={session.couple.primary_currency}
      contas={contas}
      transacoesDoMes={transacoesDoMesRes.data ?? []}
      transacoesDoPeriodo={transacoesDoPeriodoRes.data ?? []}
      despesasDoPeriodo={despesasDoPeriodoRes.data ?? []}
      transacoesVinculadas={transacoesPorId}
      periodo={periodo}
      carrosTransactionIds={carrosTransactionIds}
    />
  );
}
