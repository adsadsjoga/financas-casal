import type { AccountType } from "@/lib/database.types";
import { normalizeDescription } from "@/lib/normalize-text";

export const TIPOS_CONTA: Record<
  AccountType,
  { label: string; icon: string; hint: string }
> = {
  banco: { label: "Banco", icon: "🏦", hint: "Conta corrente ou poupança" },
  cartao: { label: "Cartão de crédito", icon: "💳", hint: "Fatura e parcelas" },
  dinheiro: { label: "Dinheiro", icon: "💵", hint: "Espécie na carteira" },
  investimento: { label: "Investimento", icon: "📈", hint: "Aplicações e reserva" },
};

/**
 * Nomes de categoria que são giro de dinheiro entre bolsos do próprio casal,
 * não gasto/receita real — excluídas de dashboard, gráficos e totais de
 * resultado. Carros de negócio são excluídos à parte, via
 * `vehicle_transaction_links` (não têm categoria fixa).
 */
export const CATEGORIAS_FORA_DO_RESULTADO = [
  "Transferências internas",
  "Saques e dinheiro",
];

const FORA_DO_RESULTADO_NORMALIZADO = new Set(
  CATEGORIAS_FORA_DO_RESULTADO.map(normalizeDescription),
);

/**
 * Compara por nome normalizado (sem acento, sem caixa), nunca por igualdade
 * literal.
 *
 * Existiam no banco duas categorias para o mesmo conceito —
 * "Transferências internas" e "Transferencias internas" — criadas por scripts
 * de importação diferentes. A comparação literal só reconhecia a primeira, e
 * as ~578 transações da segunda entravam no resultado do dashboard como
 * receita/despesa real (~70 mil EUR de cada lado). As duas foram unificadas
 * por `supabase/aplicar/08_unificar_categorias_duplicadas.sql`; normalizar
 * aqui é o que impede o problema de voltar no próximo import.
 */
export function estaForaDoResultado(nomeCategoria: string): boolean {
  return FORA_DO_RESULTADO_NORMALIZADO.has(normalizeDescription(nomeCategoria));
}

/** Categoria usada por src/lib/investimentos.ts para achar aporte em ativo. */
export const CATEGORIA_INVESTIMENTOS = "Investimentos";

export const CORES_CONTA = [
  "#3498db",
  "#e74c3c",
  "#f39c12",
  "#22c55e",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#64748b",
];
