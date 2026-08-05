import type { Account, Transaction, Vehicle, VehicleTransactionLink } from "@/lib/database.types";

export interface ResumoRecebimentoVeiculo {
  vendidoPor: number;
  recebidoBanco: number;
  recebidoCash: number;
  recebidoTotal: number;
  saldoAReceber: number;
}

/**
 * Quanto já entrou de um veículo vendido, calculado das transações
 * vinculadas — não das parcelas previstas em `vehicle_sale_installments`
 * (que são só o cronograma combinado, digitado à mão e sem cruzamento com o
 * banco).
 *
 * Só conta vínculo com `role` de dinheiro entrando (`entrada`/`parcela`) e
 * transação `receita` de verdade — um vínculo `compra`/`custo`/`ajuste` é
 * dinheiro saindo, não faz parte do recebido.
 *
 * Banco vs. cash é inferido do tipo da conta (`dinheiro` = espécie), a mesma
 * convenção que `docs/carros.md` já documenta pra "Dinheiro em mãos" — não
 * precisa de campo novo.
 *
 * Usa `amount_primary_cents` (não `amount_cents`): o preço de venda está na
 * moeda principal do casal, e uma parcela recebida numa conta de moeda
 * diferente precisa entrar já convertida pra somar certo.
 */
export function resumoRecebimentoVeiculo(
  vehicle: Pick<Vehicle, "sale_price_cents">,
  links: Pick<VehicleTransactionLink, "transaction_id" | "role">[],
  transacoes: Map<string, Pick<Transaction, "type" | "amount_primary_cents" | "account_id">>,
  contas: Map<string, Pick<Account, "type">>,
): ResumoRecebimentoVeiculo {
  let recebidoBanco = 0;
  let recebidoCash = 0;

  for (const link of links) {
    if (link.role !== "entrada" && link.role !== "parcela") continue;

    const t = transacoes.get(link.transaction_id);
    if (!t || t.type !== "receita") continue;

    const conta = contas.get(t.account_id);
    if (conta?.type === "dinheiro") {
      recebidoCash += t.amount_primary_cents;
    } else {
      recebidoBanco += t.amount_primary_cents;
    }
  }

  const vendidoPor = vehicle.sale_price_cents ?? 0;
  const recebidoTotal = recebidoBanco + recebidoCash;

  return {
    vendidoPor,
    recebidoBanco,
    recebidoCash,
    recebidoTotal,
    saldoAReceber: vendidoPor - recebidoTotal,
  };
}
