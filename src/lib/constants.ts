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
