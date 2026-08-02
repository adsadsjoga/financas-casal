export type StatusOrcamento = "ok" | "perto" | "estourou";

/** ≥90% do limite já é "perto"; passar de 100% é "estourou". */
export function statusOrcamento(gastoCents: number, limiteCents: number): StatusOrcamento {
  if (limiteCents <= 0) return "ok";
  const proporcao = gastoCents / limiteCents;
  if (proporcao > 1) return "estourou";
  if (proporcao >= 0.9) return "perto";
  return "ok";
}

/** Nunca passa de 100 — gasto pode estourar o limite, a barra não. */
export function progressoOrcamento(gastoCents: number, limiteCents: number): number {
  if (limiteCents <= 0) return 0;
  return Math.min(100, Math.round((gastoCents / limiteCents) * 100));
}

export interface TransacaoParaOrcamento {
  type: string;
  category_id: string | null;
  payer_profile_id: string | null;
  amount_primary_cents: number;
}

export interface OrcamentoBase {
  category_id: string;
  scope: "casal" | "pessoal";
  profile_id: string | null;
}

/**
 * Quanto já foi gasto num orçamento, dado o conjunto de despesas do mês.
 * Orçamento "casal" soma todo mundo na categoria; "pessoal" só conta quem
 * de fato pagou (payer_profile_id), não quem cadastrou o lançamento.
 */
export function calcularGasto(
  transacoes: TransacaoParaOrcamento[],
  orcamento: OrcamentoBase,
): number {
  return transacoes
    .filter((t) => t.type === "despesa" && t.category_id === orcamento.category_id)
    .filter((t) => orcamento.scope === "casal" || t.payer_profile_id === orcamento.profile_id)
    .reduce((acc, t) => acc + t.amount_primary_cents, 0);
}
