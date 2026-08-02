/** Formato comum de uma linha lida de um extrato, antes de qualquer enriquecimento. */
export interface ParsedRow {
  /** YYYY-MM-DD */
  date: string;
  /** Centavos, com sinal: negativo = despesa, positivo = receita. */
  amountCents: number;
  description: string;
  /** ID único do lançamento no banco (FITID do OFX), quando existir. */
  externalId: string | null;
}
