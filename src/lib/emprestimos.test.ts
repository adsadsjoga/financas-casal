import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resumoEmprestimo } from "@/lib/emprestimos";

const contas = new Map([
  ["banco", { type: "banco" as const }],
  ["dinheiro", { type: "dinheiro" as const }],
]);

describe("resumoEmprestimo", () => {
  it("emprestei: pagamento é receita entrando", () => {
    const transacoes = new Map([
      ["t1", { type: "receita" as const, amount_primary_cents: 20000, account_id: "banco" }],
    ]);
    const links = [{ transaction_id: "t1", role: "pagamento" as const }];
    const r = resumoEmprestimo(
      { principal_cents: 50000, direction: "emprestei" },
      links,
      transacoes,
      contas,
    );
    assert.equal(r.pagoBanco, 20000);
    assert.equal(r.pagoTotal, 20000);
    assert.equal(r.saldo, 30000);
  });

  it("emprestei: ignora vínculo de pagamento cuja transação é despesa", () => {
    const transacoes = new Map([
      ["t1", { type: "despesa" as const, amount_primary_cents: 20000, account_id: "banco" }],
    ]);
    const links = [{ transaction_id: "t1", role: "pagamento" as const }];
    const r = resumoEmprestimo(
      { principal_cents: 50000, direction: "emprestei" },
      links,
      transacoes,
      contas,
    );
    assert.equal(r.pagoTotal, 0);
    assert.equal(r.saldo, 50000);
  });

  it("peguei_emprestado: pagamento é despesa saindo", () => {
    const transacoes = new Map([
      ["t1", { type: "despesa" as const, amount_primary_cents: 50000, account_id: "banco" }],
    ]);
    const links = [{ transaction_id: "t1", role: "pagamento" as const }];
    const r = resumoEmprestimo(
      { principal_cents: 50000, direction: "peguei_emprestado" },
      links,
      transacoes,
      contas,
    );
    assert.equal(r.pagoBanco, 50000);
    assert.equal(r.saldo, 0);
  });

  it("peguei_emprestado: ignora vínculo de pagamento cuja transação é receita", () => {
    const transacoes = new Map([
      ["t1", { type: "receita" as const, amount_primary_cents: 50000, account_id: "banco" }],
    ]);
    const links = [{ transaction_id: "t1", role: "pagamento" as const }];
    const r = resumoEmprestimo(
      { principal_cents: 50000, direction: "peguei_emprestado" },
      links,
      transacoes,
      contas,
    );
    assert.equal(r.pagoTotal, 0);
  });

  it("ignora vínculo de desembolso — não conta como devolução", () => {
    const transacoes = new Map([
      ["t1", { type: "receita" as const, amount_primary_cents: 50000, account_id: "banco" }],
    ]);
    const links = [{ transaction_id: "t1", role: "desembolso" as const }];
    const r = resumoEmprestimo(
      { principal_cents: 50000, direction: "emprestei" },
      links,
      transacoes,
      contas,
    );
    assert.equal(r.pagoTotal, 0);
  });

  it("separa banco de cash pelo tipo da conta", () => {
    const transacoes = new Map([
      ["t1", { type: "receita" as const, amount_primary_cents: 20000, account_id: "banco" }],
      ["t2", { type: "receita" as const, amount_primary_cents: 10000, account_id: "dinheiro" }],
    ]);
    const links = [
      { transaction_id: "t1", role: "pagamento" as const },
      { transaction_id: "t2", role: "pagamento" as const },
    ];
    const r = resumoEmprestimo(
      { principal_cents: 50000, direction: "emprestei" },
      links,
      transacoes,
      contas,
    );
    assert.equal(r.pagoBanco, 20000);
    assert.equal(r.pagoCash, 10000);
    assert.equal(r.pagoTotal, 30000);
  });

  it("saldo negativo quando pago mais do que o principal", () => {
    const transacoes = new Map([
      ["t1", { type: "receita" as const, amount_primary_cents: 60000, account_id: "banco" }],
    ]);
    const links = [{ transaction_id: "t1", role: "pagamento" as const }];
    const r = resumoEmprestimo(
      { principal_cents: 50000, direction: "emprestei" },
      links,
      transacoes,
      contas,
    );
    assert.equal(r.saldo, -10000);
  });
});
