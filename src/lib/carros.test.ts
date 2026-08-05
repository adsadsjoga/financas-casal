import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resumoRecebimentoVeiculo } from "@/lib/carros";

const contas = new Map([
  ["banco", { type: "banco" as const }],
  ["dinheiro", { type: "dinheiro" as const }],
]);

describe("resumoRecebimentoVeiculo", () => {
  it("soma só entrada/parcela em conta banco", () => {
    const transacoes = new Map([
      ["t1", { type: "receita" as const, amount_primary_cents: 150000, account_id: "banco" }],
      ["t2", { type: "receita" as const, amount_primary_cents: 150000, account_id: "banco" }],
    ]);
    const links = [
      { transaction_id: "t1", role: "entrada" as const },
      { transaction_id: "t2", role: "parcela" as const },
    ];
    const r = resumoRecebimentoVeiculo({ sale_price_cents: 300000 }, links, transacoes, contas);
    assert.equal(r.recebidoBanco, 300000);
    assert.equal(r.recebidoCash, 0);
    assert.equal(r.recebidoTotal, 300000);
    assert.equal(r.saldoAReceber, 0);
  });

  it("separa banco de cash pelo tipo da conta", () => {
    const transacoes = new Map([
      ["t1", { type: "receita" as const, amount_primary_cents: 200000, account_id: "banco" }],
      ["t2", { type: "receita" as const, amount_primary_cents: 100000, account_id: "dinheiro" }],
    ]);
    const links = [
      { transaction_id: "t1", role: "entrada" as const },
      { transaction_id: "t2", role: "parcela" as const },
    ];
    const r = resumoRecebimentoVeiculo({ sale_price_cents: 300000 }, links, transacoes, contas);
    assert.equal(r.recebidoBanco, 200000);
    assert.equal(r.recebidoCash, 100000);
    assert.equal(r.recebidoTotal, 300000);
  });

  it("ignora vínculo de compra/custo/ajuste — não é dinheiro entrando", () => {
    const transacoes = new Map([
      ["t1", { type: "despesa" as const, amount_primary_cents: 150000, account_id: "banco" }],
    ]);
    const links = [{ transaction_id: "t1", role: "compra" as const }];
    const r = resumoRecebimentoVeiculo({ sale_price_cents: 300000 }, links, transacoes, contas);
    assert.equal(r.recebidoTotal, 0);
  });

  it("ignora vínculo cuja transação não é receita, mesmo com role certo", () => {
    const transacoes = new Map([
      ["t1", { type: "despesa" as const, amount_primary_cents: 5000, account_id: "banco" }],
    ]);
    const links = [{ transaction_id: "t1", role: "parcela" as const }];
    const r = resumoRecebimentoVeiculo({ sale_price_cents: 300000 }, links, transacoes, contas);
    assert.equal(r.recebidoTotal, 0);
  });

  it("saldo negativo quando recebeu mais do que o combinado", () => {
    const transacoes = new Map([
      ["t1", { type: "receita" as const, amount_primary_cents: 350000, account_id: "banco" }],
    ]);
    const links = [{ transaction_id: "t1", role: "entrada" as const }];
    const r = resumoRecebimentoVeiculo({ sale_price_cents: 300000 }, links, transacoes, contas);
    assert.equal(r.saldoAReceber, -50000);
  });

  it("veículo sem preço de venda (ainda em estoque) não quebra", () => {
    const r = resumoRecebimentoVeiculo({ sale_price_cents: null }, [], new Map(), contas);
    assert.equal(r.vendidoPor, 0);
    assert.equal(r.saldoAReceber, 0);
  });
});
