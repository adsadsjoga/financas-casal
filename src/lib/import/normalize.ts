import { createHash } from "node:crypto";
import { normalizeDescription } from "@/lib/normalize-text";

/**
 * Reexportada de `lib/normalize-text.ts` para não quebrar os imports que já
 * apontam para cá. Usada neste módulo só para SUGERIR duplicata e casar regra
 * de categorização antes de gravar — o valor definitivo é sempre recalculado
 * pelo trigger do Postgres na hora do insert, então uma pequena divergência
 * aqui só faria perder um aviso de duplicata, nunca corromper dado.
 */
export { normalizeDescription };

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
