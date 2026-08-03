import type { AccountType } from "@/lib/database.types";

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
