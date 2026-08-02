import { createHash } from "node:crypto";

/**
 * Espelha normalize_description() do banco (supabase/schema.sql): minúsculas,
 * sem acento, sem pontuação, espaços colapsados. Usada aqui só para SUGERIR
 * duplicata e casar regra de categorização antes de gravar — o valor
 * definitivo é sempre recalculado pelo trigger do Postgres na hora do
 * insert, então uma pequena divergência aqui só faria perder um aviso de
 * duplicata, nunca corromper dado.
 */
const MARCAS_DIACRITICAS = /[̀-ͯ]/g;

export function normalizeDescription(text: string): string {
  return text
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Espelha o fingerprint calculado pelo trigger transactions_before_write(). */
export function computeFingerprint(
  accountId: string,
  occurredOn: string,
  amountCents: number,
  type: "receita" | "despesa",
  description: string,
): string {
  const raw = `${accountId}|${occurredOn}|${amountCents}|${type}|${normalizeDescription(description)}`;
  return createHash("md5").update(raw).digest("hex");
}

export function fileHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
