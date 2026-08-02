"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseBRL } from "@/lib/money";
import { parseOfx } from "@/lib/import/ofx";
import { parseCsvLinhas, parseDataColuna, type MapeamentoCsv } from "@/lib/import/csv";
import { computeFingerprint, fileHash, normalizeDescription } from "@/lib/import/normalize";
import type { ParsedRow } from "@/lib/import/types";
import type { ImportSource, SplitMode } from "@/lib/database.types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface PreviewRow {
  key: string;
  date: string;
  /** Sempre positivo — a direção já está em `type`. */
  amountCents: number;
  description: string;
  externalId: string | null;
  type: "receita" | "despesa";
  isDuplicate: boolean;
  duplicateReason: "external_id" | "fingerprint" | null;
  suggestedCategoryId: string | null;
}

export interface AnalisarResult extends ActionResult {
  fileHash?: string;
  jaImportadoAntes?: boolean;
  rows?: PreviewRow[];
  linhasIgnoradas?: number;
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

async function montarPreview(
  supabase: SupabaseServer,
  parsed: ParsedRow[],
  accountId: string,
  coupleId: string,
): Promise<PreviewRow[]> {
  const comTipo = parsed.map((p) => ({
    ...p,
    type: (p.amountCents < 0 ? "despesa" : "receita") as "despesa" | "receita",
    amountCents: Math.abs(p.amountCents),
  }));

  const fingerprints = comTipo.map((r) =>
    computeFingerprint(accountId, r.date, r.amountCents, r.type, r.description),
  );
  const externalIds = comTipo.map((r) => r.externalId).filter((x): x is string => !!x);

  const [{ data: regras }, { data: porExternalId }, { data: porFingerprint }] = await Promise.all([
    supabase.from("import_rules").select("*").eq("couple_id", coupleId),
    externalIds.length
      ? supabase.from("transactions").select("external_id").eq("account_id", accountId).in("external_id", externalIds)
      : Promise.resolve({ data: [] as { external_id: string | null }[] }),
    fingerprints.length
      ? supabase.from("transactions").select("fingerprint").eq("account_id", accountId).in("fingerprint", fingerprints)
      : Promise.resolve({ data: [] as { fingerprint: string | null }[] }),
  ]);

  const existentesExternalId = new Set((porExternalId ?? []).map((r) => r.external_id));
  const existentesFingerprint = new Set((porFingerprint ?? []).map((r) => r.fingerprint));

  return comTipo.map((r, i) => {
    const fp = fingerprints[i];
    const dupExternal = r.externalId ? existentesExternalId.has(r.externalId) : false;
    const dupFingerprint = existentesFingerprint.has(fp);

    const normDesc = normalizeDescription(r.description);
    const regra = (regras ?? []).find((reg) =>
      reg.match_type === "contains"
        ? normDesc.includes(reg.pattern)
        : (() => {
            try {
              return new RegExp(reg.pattern, "i").test(r.description);
            } catch {
              return false;
            }
          })(),
    );

    return {
      key: `${i}-${fp}`,
      date: r.date,
      amountCents: r.amountCents,
      description: r.description,
      externalId: r.externalId,
      type: r.type,
      isDuplicate: dupExternal || dupFingerprint,
      duplicateReason: dupExternal ? "external_id" : dupFingerprint ? "fingerprint" : null,
      suggestedCategoryId: regra?.category_id ?? null,
    };
  });
}

async function analisarComum(
  supabase: SupabaseServer,
  coupleId: string,
  accountId: string,
  conteudo: string,
  parsed: ParsedRow[],
  linhasIgnoradas: number,
): Promise<AnalisarResult> {
  if (parsed.length === 0) {
    return { ok: false, error: "Não encontrei nenhum lançamento nesse arquivo." };
  }

  const hash = fileHash(conteudo);
  const { data: importAnterior } = await supabase
    .from("imports")
    .select("id")
    .eq("couple_id", coupleId)
    .eq("file_hash", hash)
    .eq("status", "concluido")
    .maybeSingle();

  const rows = await montarPreview(supabase, parsed, accountId, coupleId);
  return { ok: true, fileHash: hash, jaImportadoAntes: !!importAnterior, rows, linhasIgnoradas };
}

export async function analisarOfx(conteudo: string, accountId: string): Promise<AnalisarResult> {
  const session = await requireSession();
  const supabase = await createClient();
  const parsed = parseOfx(conteudo);
  return analisarComum(supabase, session.couple.id, accountId, conteudo, parsed, 0);
}

export async function analisarCsv(
  conteudo: string,
  accountId: string,
  mapping: MapeamentoCsv,
): Promise<AnalisarResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const linhas = parseCsvLinhas(conteudo);
  const dados = mapping.temCabecalho ? linhas.slice(1) : linhas;

  const parsed: ParsedRow[] = [];
  let ignoradas = 0;

  for (const linha of dados) {
    if (linha.length === 0 || linha.every((c) => !c?.trim())) continue;

    const dataRaw = linha[mapping.dataCol]?.trim() ?? "";
    const descRaw = linha[mapping.descCol]?.trim() ?? "";
    const valorRaw = linha[mapping.valorCol]?.trim() ?? "";

    const data = parseDataColuna(dataRaw, mapping.formatoData);
    let cents = parseBRL(valorRaw);

    if (data === null || cents === null || cents === 0) {
      ignoradas++;
      continue;
    }
    if (mapping.inverterSinal) cents = -cents;

    parsed.push({ date: data, amountCents: cents, description: descRaw || "(sem descrição)", externalId: null });
  }

  if (parsed.length === 0) {
    return {
      ok: false,
      error: "Não consegui interpretar nenhuma linha. Confira o mapeamento de colunas e o formato da data.",
    };
  }

  return analisarComum(supabase, session.couple.id, accountId, conteudo, parsed, ignoradas);
}

export interface LinhaConfirmada {
  date: string;
  amountCents: number;
  description: string;
  externalId: string | null;
  type: "receita" | "despesa";
  categoryId: string | null;
}

export async function confirmarImportacao(
  accountId: string,
  fileName: string,
  hash: string,
  source: ImportSource,
  linhas: LinhaConfirmada[],
): Promise<ActionResult & { importadas?: number }> {
  const session = await requireSession();
  const supabase = await createClient();

  if (linhas.length === 0) return { ok: false, error: "Nenhum lançamento selecionado." };

  const { data: importRow, error: erroImport } = await supabase
    .from("imports")
    .insert({
      couple_id: session.couple.id,
      account_id: accountId,
      file_name: fileName,
      file_hash: hash,
      source,
      rows_total: linhas.length,
      rows_imported: 0,
      status: "revisando",
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (erroImport || !importRow) {
    return { ok: false, error: erroImport?.message ?? "Não consegui iniciar a importação." };
  }

  const payload = linhas.map((l) => ({
    couple_id: session.couple.id,
    account_id: accountId,
    category_id: l.categoryId,
    created_by: session.userId,
    payer_profile_id: l.type === "despesa" ? session.userId : null,
    type: l.type,
    amount_cents: l.amountCents,
    description: l.description,
    occurred_on: l.date,
    split_mode: "none" as SplitMode,
    import_id: importRow.id,
    external_id: l.externalId,
  }));

  const { error: erroInsert } = await supabase.from("transactions").insert(payload);

  if (erroInsert) {
    await supabase.from("imports").update({ status: "cancelado" }).eq("id", importRow.id);
    if ((erroInsert as { code?: string }).code === "23505") {
      return {
        ok: false,
        error:
          "Algum desses lançamentos já existe nessa conta. Desmarque os itens marcados como duplicados e tente de novo.",
      };
    }
    return { ok: false, error: erroInsert.message };
  }

  await supabase
    .from("imports")
    .update({ status: "concluido", rows_imported: linhas.length })
    .eq("id", importRow.id);

  revalidatePath("/transacoes");
  revalidatePath("/");
  revalidatePath("/importar");
  revalidatePath("/orcamentos");

  return { ok: true, importadas: linhas.length };
}

/**
 * Cria (ou reforça) uma regra de categorização a partir de uma correção do
 * usuário — é o "aplicar sempre a lançamentos assim" do plano. O padrão é
 * as duas primeiras palavras da descrição normalizada, porque em extrato de
 * banco o nome do estabelecimento costuma vir primeiro ("TESCO 4527...").
 */
export async function criarRegraCategoria(
  descricaoOriginal: string,
  categoryId: string,
): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await createClient();

  const normalizada = normalizeDescription(descricaoOriginal);
  const palavras = normalizada.split(" ").filter(Boolean);
  const pattern = palavras.length >= 2 ? palavras.slice(0, 2).join(" ") : (palavras[0] ?? "");

  if (!pattern) return { ok: false, error: "Descrição vazia." };

  const { error } = await supabase.from("import_rules").upsert(
    {
      couple_id: session.couple.id,
      match_type: "contains" as const,
      pattern,
      category_id: categoryId,
    },
    { onConflict: "couple_id,match_type,pattern" },
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
