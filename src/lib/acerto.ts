import type { Settlement, SettlementItem } from "@/lib/database.types";
import type { TransacaoParaSugestao } from "@/lib/splits";

export interface ContaDoAcerto {
  id: string;
  owner_profile_id: string | null;
}

export function contaRecebimentoId(
  transacao: Pick<TransacaoParaSugestao, "type" | "account_id" | "transfer_account_id">,
): string | null {
  if (transacao.type === "receita") return transacao.account_id;
  if (transacao.type === "transferencia") return transacao.transfer_account_id ?? null;
  return null;
}

export function pagamentoCombinaComDivida(
  transacao: Pick<TransacaoParaSugestao, "type" | "account_id" | "transfer_account_id">,
  donoDaContaPorId: Map<string, string | null>,
  devedorProfileId: string,
  credorProfileId: string,
): boolean {
  const contaRecebimento = contaRecebimentoId(transacao);
  const donoRecebimento = contaRecebimento
    ? (donoDaContaPorId.get(contaRecebimento) ?? null)
    : null;

  if (transacao.type === "receita") {
    return donoRecebimento === credorProfileId;
  }

  if (transacao.type === "transferencia") {
    const donoOrigem = donoDaContaPorId.get(transacao.account_id) ?? null;
    return donoOrigem === devedorProfileId && donoRecebimento === credorProfileId;
  }

  return false;
}

export function calcularUsoPorPagamento(
  settlements: Array<Pick<Settlement, "id" | "transaction_id" | "amount_cents">>,
  settlementItems: Array<Pick<SettlementItem, "settlement_id" | "amount_cents">>,
): Map<string, number> {
  const totalItensPorSettlement = new Map<string, number>();
  for (const item of settlementItems) {
    totalItensPorSettlement.set(
      item.settlement_id,
      (totalItensPorSettlement.get(item.settlement_id) ?? 0) + item.amount_cents,
    );
  }

  const usoPorPagamento = new Map<string, number>();
  for (const settlement of settlements) {
    if (!settlement.transaction_id) continue;
    const valorUsado = totalItensPorSettlement.has(settlement.id)
      ? (totalItensPorSettlement.get(settlement.id) ?? 0)
      : settlement.amount_cents;
    usoPorPagamento.set(
      settlement.transaction_id,
      (usoPorPagamento.get(settlement.transaction_id) ?? 0) + valorUsado,
    );
  }

  return usoPorPagamento;
}
