"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseBRL, splitCents } from "@/lib/money";
import { calcularShares, escalarShares } from "@/lib/splits";
import { obterCotacao } from "@/lib/fx";
import { addMesesMantendoDia, dataBR } from "@/lib/dates";
import type { SplitMode, Transaction, TxType } from "@/lib/database.types";

/**
 * Divisão já gravada de uma transação — usado pra reidratar o formulário de
 * edição quando `split_mode = 'custom'`: sem isso, a prévia recalculava do
 * zero com peso igual (50/50) e não refletia o valor customizado real.
 */
export async function buscarSplitsTransacao(
  transactionId: string,
): Promise<Record<string, number>> {
  await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("transaction_splits")
    .select("profile_id, share_cents")
    .eq("transaction_id", transactionId);

  return Object.fromEntries((data ?? []).map((s) => [s.profile_id, s.share_cents]));
}

export interface TransacaoInput {
  id?: string;
  type: TxType;
  account_id: string;
  transfer_account_id?: string;
  category_id?: string;
  valor: string;
  description: string;
  occurred_on: string;
  payer_profile_id?: string;
  split_mode: SplitMode;
  /** profile_id -> centavos, só quando split_mode = "custom". */
  custom_shares?: Record<string, number>;
  /** 1 = à vista. Acima disso vira compra parcelada. */
  parcelas?: number;
  /** Projetos aos quais o lançamento pertence. Substitui os vínculos atuais. */
  project_ids?: string[];
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function revalidarTudo() {
  revalidatePath("/");
  revalidatePath("/transacoes");
  revalidatePath("/contas");
  revalidatePath("/acerto");
  revalidatePath("/orcamentos");
  revalidatePath("/projetos");
}

/**
 * Deixa os vínculos de projeto exatamente como `projectIds` pede.
 *
 * Numa compra parcelada todas as parcelas entram no mesmo projeto: uma viagem
 * paga em 3x continua custando o total, e vincular só a primeira parcela
 * mostraria um terço do custo real.
 */
async function sincronizarProjetos(
  supabase: SupabaseServer,
  transactionIds: string[],
  projectIds: string[] | undefined,
): Promise<string | null> {
  if (projectIds === undefined || transactionIds.length === 0) return null;

  const { error: erroDelete } = await supabase
    .from("project_transactions")
    .delete()
    .in("transaction_id", transactionIds);
  if (erroDelete) return erroDelete.message;

  if (projectIds.length === 0) return null;

  const linhas = transactionIds.flatMap((transaction_id) =>
    projectIds.map((project_id) => ({ project_id, transaction_id })),
  );
  const { error } = await supabase.from("project_transactions").insert(linhas);
  return error?.message ?? null;
}

export async function salvarTransacao(
  input: TransacaoInput,
): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const valor = parseBRL(input.valor);
  if (valor === null) return { ok: false, error: "Valor inválido." };
  if (valor <= 0)
    return { ok: false, error: "O valor precisa ser maior que zero." };

  if (!input.account_id) return { ok: false, error: "Escolha a conta." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurred_on)) {
    return { ok: false, error: "Data inválida." };
  }

  if (input.type === "transferencia") {
    if (!input.transfer_account_id) {
      return { ok: false, error: "Escolha a conta de destino." };
    }
    if (input.transfer_account_id === input.account_id) {
      return { ok: false, error: "Origem e destino precisam ser diferentes." };
    }
  }

  const splitMode: SplitMode =
    input.type === "despesa" ? input.split_mode : "none";

  // Conta em outra moeda: busca a cotação do dia do lançamento e congela nela.
  const { data: contaInfo } = await supabase
    .from("accounts")
    .select("currency")
    .eq("id", input.account_id)
    .single();

  const moedaConta = contaInfo?.currency ?? session.couple.primary_currency;
  const cotacao =
    moedaConta === session.couple.primary_currency
      ? { rate: 1 }
      : await obterCotacao(
          moedaConta,
          session.couple.primary_currency,
          input.occurred_on,
        );

  const base = {
    rate_to_primary: cotacao.rate,
    couple_id: session.couple.id,
    account_id: input.account_id,
    category_id: input.category_id || null,
    created_by: session.userId,
    payer_profile_id:
      input.type === "despesa"
        ? input.payer_profile_id || session.userId
        : null,
    type: input.type,
    description: input.description.trim(),
    transfer_account_id:
      input.type === "transferencia" ? input.transfer_account_id! : null,
    split_mode: splitMode,
  };

  // --- Edição: mexe só nesta linha, mesmo se for uma parcela de um grupo. ---
  if (input.id) {
    const { error } = await supabase
      .from("transactions")
      .update({ ...base, amount_cents: valor, occurred_on: input.occurred_on })
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };

    const erroSplit = await gravarSplits(
      supabase,
      input.id,
      valor,
      splitMode,
      session.members,
      input.custom_shares,
    );
    if (erroSplit) return { ok: false, error: erroSplit };

    const erroProjetos = await sincronizarProjetos(
      supabase,
      [input.id],
      input.project_ids,
    );
    if (erroProjetos) return { ok: false, error: erroProjetos };

    revalidarTudo();
    return { ok: true };
  }

  // --- Criação ---
  const parcelas = Math.max(1, Math.min(72, Math.floor(input.parcelas ?? 1)));

  if (parcelas === 1) {
    const { data, error } = await supabase
      .from("transactions")
      .insert({ ...base, amount_cents: valor, occurred_on: input.occurred_on })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    const erroSplit = await gravarSplits(
      supabase,
      data.id,
      valor,
      splitMode,
      session.members,
      input.custom_shares,
    );
    if (erroSplit) return { ok: false, error: erroSplit };

    const erroProjetos = await sincronizarProjetos(
      supabase,
      [data.id],
      input.project_ids,
    );
    if (erroProjetos) return { ok: false, error: erroProjetos };

    revalidarTudo();
    return { ok: true };
  }

  // Parcelado: o valor é fatiado sem perder centavo — 100,00 em 3 vira
  // 33,34 + 33,33 + 33,33, e a soma bate exatamente com a compra.
  const valores = splitCents(valor, new Array(parcelas).fill(1));
  const grupo = crypto.randomUUID();

  const linhas = valores.map((v, i) => ({
    ...base,
    amount_cents: v,
    occurred_on: addMesesMantendoDia(input.occurred_on, i),
    installment_group_id: grupo,
    installment_no: i + 1,
    installment_total: parcelas,
  }));

  const { data, error } = await supabase
    .from("transactions")
    .insert(linhas)
    .select("id, amount_cents");
  if (error) return { ok: false, error: error.message };

  for (const linha of data ?? []) {
    const erroSplit = await gravarSplits(
      supabase,
      linha.id,
      linha.amount_cents,
      splitMode,
      session.members,
      input.custom_shares,
    );
    if (erroSplit) return { ok: false, error: erroSplit };
  }

  const erroProjetos = await sincronizarProjetos(
    supabase,
    (data ?? []).map((l) => l.id),
    input.project_ids,
  );
  if (erroProjetos) return { ok: false, error: erroProjetos };

  revalidarTudo();
  return { ok: true };
}

export interface ExportarInput {
  /** Vazio = todas as contas do casal. */
  accountIds: string[];
  /** YYYY-MM-DD; null = sem limite inferior ("desde o início"). */
  desde: string | null;
  /** YYYY-MM-DD; null = hoje. */
  ate: string | null;
}

export type ExportarResult =
  | { ok: true; csv: string; nomeArquivo: string; total: number }
  | { ok: false; error: string };

/** Campo com `;`, aspas ou quebra de linha precisa ir entre aspas duplas. */
function celulaCsv(valor: string): string {
  if (/[;"\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

/**
 * Gera a planilha (CSV) das transações do casal para revisão offline de
 * categoria. `;` como separador e vírgula decimal — é o que o Excel em
 * português abre certo sem assistente de importação.
 */
export async function exportarTransacoesCsv(
  input: ExportarInput,
): Promise<ExportarResult> {
  const session = await requireSession();
  const supabase = await createClient();

  // Paginado de propósito. O PostgREST corta a resposta em `db-max-rows`
  // (1000 no Supabase) e não avisa: um `.select("*")` sem `.range()` devolvia
  // as 1000 primeiras linhas como se fossem todas, e o `total` reportava
  // 1000. Deu para ver no arquivo real: o export de abr–jun/2026 terminava em
  // 30/04, sem maio nem junho, sem nenhum erro na tela — e ele estava sendo
  // usado justamente para conferir a base contra a planilha.
  const PAGINA = 1000;
  const paginaDeTransacoes = (de: number) => {
    let q = supabase
      .from("transactions")
      .select("*")
      .eq("couple_id", session.couple.id)
      .order("occurred_on", { ascending: true })
      .order("created_at", { ascending: true })
      .range(de, de + PAGINA - 1);

    if (input.accountIds.length > 0) q = q.in("account_id", input.accountIds);
    if (input.desde) q = q.gte("occurred_on", input.desde);
    if (input.ate) q = q.lte("occurred_on", input.ate);
    return q;
  };

  const [primeiraPagina, contasRes, categoriasRes] = await Promise.all([
    paginaDeTransacoes(0),
    supabase
      .from("accounts")
      .select("id, name, currency, owner_profile_id")
      .eq("couple_id", session.couple.id),
    supabase
      .from("categories")
      .select("id, name, kind")
      .eq("couple_id", session.couple.id),
  ]);

  if (primeiraPagina.error) {
    return { ok: false, error: primeiraPagina.error.message };
  }

  const transacoes = (primeiraPagina.data ?? []) as Transaction[];
  // Página cheia = pode haver mais. Só para quando vier página incompleta.
  while (transacoes.length % PAGINA === 0 && transacoes.length > 0) {
    const proxima = await paginaDeTransacoes(transacoes.length);
    if (proxima.error) return { ok: false, error: proxima.error.message };
    const linhas = (proxima.data ?? []) as Transaction[];
    if (linhas.length === 0) break;
    transacoes.push(...linhas);
  }

  const mapaContas = new Map(
    (contasRes.data ?? []).map((c) => [
      c.id,
      c as {
        id: string;
        name: string;
        currency: string;
        owner_profile_id: string | null;
      },
    ]),
  );
  const mapaCategorias = new Map(
    (categoriasRes.data ?? []).map((c) => [
      c.id,
      c as { id: string; name: string; kind: string },
    ]),
  );
  const mapaPessoas = new Map(
    session.members.map((m) => [m.profile_id, m.profile.display_name]),
  );

  // "Titular" existe porque duas contas diferentes se chamam "Revolut" (a do
  // Gabriel e a da Joana), distinguidas só por `owner_profile_id` — mesmo caso
  // de "Revolut Poupança"/"Revolut Poupanca". Sem esta coluna não dá para
  // saber de quem é cada linha do arquivo. Renomear as contas resolveria
  // também, mas quebraria os scripts de Documents\Contas casal, que casam
  // conta por nome literal.
  const cabecalho = [
    "Data",
    "Conta",
    "Titular",
    "Tipo",
    "Categoria",
    "Descrição",
    "Valor",
    "Moeda",
    "Pessoa",
    "Parcela",
    "Precisa revisar",
  ];

  const TIPO_LABEL: Record<TxType, string> = {
    receita: "Receita",
    despesa: "Despesa",
    transferencia: "Transferência",
  };

  const linhas = transacoes.map((t) => {
    const conta = mapaContas.get(t.account_id);
    const categoria = t.category_id ? mapaCategorias.get(t.category_id) : null;
    const pessoa = t.payer_profile_id
      ? (mapaPessoas.get(t.payer_profile_id) ?? "")
      : "";
    const parcela =
      t.installment_total && t.installment_total > 1
        ? `${t.installment_no}/${t.installment_total}`
        : "";
    const valor = (t.amount_cents / 100).toFixed(2).replace(".", ",");

    return [
      dataBR(t.occurred_on),
      conta?.name ?? "",
      conta?.owner_profile_id
        ? (mapaPessoas.get(conta.owner_profile_id) ?? "")
        : "Conjunta",
      TIPO_LABEL[t.type],
      categoria?.name ?? "",
      t.description ?? "",
      valor,
      conta?.currency ?? session.couple.primary_currency,
      pessoa,
      parcela,
      t.needs_review ? "Sim" : "Não",
    ]
      .map(celulaCsv)
      .join(";");
  });

  // BOM no início: sem ele o Excel lê acento errado num arquivo UTF-8.
  const csv = "﻿" + [cabecalho.join(";"), ...linhas].join("\r\n");

  const contaUnica =
    input.accountIds.length === 1
      ? mapaContas.get(input.accountIds[0])?.name
      : null;
  const sufixoConta = contaUnica
    ? "_" + contaUnica.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    : input.accountIds.length > 0
      ? "_algumas-contas"
      : "_todas-as-contas";
  const sufixoPeriodo = `${input.desde ?? "inicio"}_a_${input.ate ?? "hoje"}`;

  return {
    ok: true,
    csv,
    nomeArquivo: `transacoes${sufixoConta}_${sufixoPeriodo}.csv`,
    total: transacoes.length,
  };
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/**
 * Regrava os shares da transação. Retorna a mensagem de erro, ou null.
 * Exportada porque `fixas/actions.ts` também precisa gravar split ao lançar
 * uma recorrência — mesma regra, não duplicar o cálculo.
 */
export async function gravarSplits(
  supabase: SupabaseServer,
  transactionId: string,
  amountCents: number,
  mode: SplitMode,
  members: Array<{ profile_id: string; income_cents: number }>,
  custom?: Record<string, number>,
): Promise<string | null> {
  await supabase
    .from("transaction_splits")
    .delete()
    .eq("transaction_id", transactionId);

  if (mode === "none") return null;

  const shares = calcularShares(amountCents, mode, members, custom);
  if (shares.length === 0) return null;

  const { error } = await supabase.from("transaction_splits").insert(
    shares.map((s) => ({
      transaction_id: transactionId,
      profile_id: s.profile_id,
      share_cents: s.share_cents,
    })),
  );
  return error ? error.message : null;
}

/**
 * Divide um lançamento em dois — para o caso de reembolso parcial: a compra
 * original tinha um valor, mas só parte dela é "sua" (o resto volta ou é de
 * outra pessoa). A transação original fica com `valorPrimeiraParteCents`, e
 * uma segunda nasce com o restante — mesma conta, data, categoria, tipo e
 * divisão, prontas pra editar cada uma separadamente depois.
 */
export async function dividirTransacao(
  id: string,
  valorPrimeiraParteCents: number,
): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: original, error: erroBusca } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();
  if (erroBusca || !original) return { ok: false, error: "Lançamento não encontrado." };

  const t = original as Transaction;
  if (t.type === "transferencia") {
    return { ok: false, error: "Não dá para dividir uma transferência." };
  }
  if (!Number.isInteger(valorPrimeiraParteCents) || valorPrimeiraParteCents <= 0) {
    return { ok: false, error: "Valor inválido." };
  }
  if (valorPrimeiraParteCents >= t.amount_cents) {
    return { ok: false, error: "O valor precisa ser menor que o total do lançamento." };
  }

  const valorSegundaParte = t.amount_cents - valorPrimeiraParteCents;

  // Se a divisão for customizada, busca os shares reais gravados ANTES de
  // mexer em qualquer coisa — sem isso, as duas partes cairiam pra peso
  // igual (calcularShares não tem como adivinhar um valor customizado que
  // não foi passado) e a divisão de verdade (ex. Vodafone 70/30) se perderia
  // silenciosamente.
  let sharesCustomOriginais: Record<string, number> | null = null;
  if (t.split_mode === "custom") {
    const { data: splitsAtuais } = await supabase
      .from("transaction_splits")
      .select("profile_id, share_cents")
      .eq("transaction_id", id);
    if (splitsAtuais && splitsAtuais.length > 0) {
      sharesCustomOriginais = Object.fromEntries(
        splitsAtuais.map((s) => [s.profile_id, s.share_cents]),
      );
    }
  }

  const { error: erroUpdate } = await supabase
    .from("transactions")
    .update({ amount_cents: valorPrimeiraParteCents })
    .eq("id", id);
  if (erroUpdate) return { ok: false, error: erroUpdate.message };

  const { data: nova, error: erroInsert } = await supabase
    .from("transactions")
    .insert({
      couple_id: t.couple_id,
      account_id: t.account_id,
      category_id: t.category_id,
      created_by: session.userId,
      payer_profile_id: t.payer_profile_id,
      type: t.type,
      description: t.description,
      occurred_on: t.occurred_on,
      split_mode: t.split_mode,
      amount_cents: valorSegundaParte,
    })
    .select("id")
    .single();
  if (erroInsert || !nova) {
    return { ok: false, error: erroInsert?.message ?? "Não consegui criar a segunda parte." };
  }

  // Regrava a divisão dos dois lados com o valor novo — "meio a meio" de um
  // valor diferente não é a mesma partilha de antes. Divisão customizada é
  // escalada proporcionalmente (não recalculada do zero), pra 70/30
  // continuar 70/30 nas duas partes.
  const erroSplitOriginal = await gravarSplits(
    supabase,
    id,
    valorPrimeiraParteCents,
    t.split_mode,
    session.members,
    sharesCustomOriginais
      ? escalarShares(sharesCustomOriginais, t.amount_cents, valorPrimeiraParteCents)
      : undefined,
  );
  if (erroSplitOriginal) return { ok: false, error: erroSplitOriginal };

  const erroSplitNova = await gravarSplits(
    supabase,
    nova.id,
    valorSegundaParte,
    t.split_mode,
    session.members,
    sharesCustomOriginais
      ? escalarShares(sharesCustomOriginais, t.amount_cents, valorSegundaParte)
      : undefined,
  );
  if (erroSplitNova) return { ok: false, error: erroSplitNova };

  // A segunda parte pertence ao(s) mesmo(s) projeto(s) que a original —
  // dividir um gasto de viagem em dois não tira nenhum dos dois da viagem.
  const { data: vinculos } = await supabase
    .from("project_transactions")
    .select("project_id")
    .eq("transaction_id", id);
  if (vinculos && vinculos.length > 0) {
    await supabase
      .from("project_transactions")
      .insert(vinculos.map((v) => ({ project_id: v.project_id, transaction_id: nova.id })));
  }

  revalidarTudo();
  return { ok: true };
}

export async function excluirTransacao(
  id: string,
  grupoInteiro = false,
): Promise<ActionResult> {
  await requireSession();
  const supabase = await createClient();

  if (grupoInteiro) {
    const { data } = await supabase
      .from("transactions")
      .select("installment_group_id")
      .eq("id", id)
      .single();

    if (data?.installment_group_id) {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("installment_group_id", data.installment_group_id);
      if (error) return { ok: false, error: error.message };
      revalidarTudo();
      return { ok: true };
    }
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidarTudo();
  return { ok: true };
}
