import type { Account, Loan, LoanTransactionLink, Transaction } from "@/lib/database.types";

export interface ResumoEmprestimo {
  principal: number;
  pagoBanco: number;
  pagoCash: number;
  pagoTotal: number;
  /** Positivo: ainda falta (a receber se `emprestei`, a pagar se `peguei_emprestado`). */
  saldo: number;
}

/**
 * Quanto já foi pago de um empréstimo, calculado das transações vinculadas
 * — mesma lógica de `resumoRecebimentoVeiculo` em `src/lib/carros.ts`.
 *
 * O sentido do lançamento esperado no vínculo `pagamento` depende da direção
 * do empréstimo: se eu emprestei, a devolução é dinheiro entrando aqui
 * (receita); se eu peguei emprestado, a devolução é dinheiro saindo daqui
 * (despesa). Um vínculo `desembolso` não conta pro saldo — é só o registro
 * de quando o dinheiro original saiu/entrou, não uma devolução.
 */
export function resumoEmprestimo(
  loan: Pick<Loan, "principal_cents" | "direction">,
  links: Pick<LoanTransactionLink, "transaction_id" | "role">[],
  transacoes: Map<string, Pick<Transaction, "type" | "amount_primary_cents" | "account_id">>,
  contas: Map<string, Pick<Account, "type">>,
): ResumoEmprestimo {
  let pagoBanco = 0;
  let pagoCash = 0;

  const tipoEsperado = loan.direction === "emprestei" ? "receita" : "despesa";

  for (const link of links) {
    if (link.role !== "pagamento") continue;

    const t = transacoes.get(link.transaction_id);
    if (!t || t.type !== tipoEsperado) continue;

    const conta = contas.get(t.account_id);
    if (conta?.type === "dinheiro") {
      pagoCash += t.amount_primary_cents;
    } else {
      pagoBanco += t.amount_primary_cents;
    }
  }

  const principal = loan.principal_cents;
  const pagoTotal = pagoBanco + pagoCash;

  return {
    principal,
    pagoBanco,
    pagoCash,
    pagoTotal,
    saldo: principal - pagoTotal,
  };
}
