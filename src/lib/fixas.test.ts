import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { construirExtratoPrevisao, cruzarComLancamentos } from "@/lib/fixas";

interface Recorrencia {
  id: string;
  type: string;
  amount_cents: number;
  day_of_month: number;
  active: boolean;
}

const aluguel: Recorrencia = { id: "1", type: "despesa", amount_cents: 100000, day_of_month: 5, active: true };
const salario: Recorrencia = { id: "2", type: "receita", amount_cents: 300000, day_of_month: 28, active: true };
const luz: Recorrencia = { id: "3", type: "despesa", amount_cents: 20000, day_of_month: 15, active: true };

describe("construirExtratoPrevisao", () => {
  it("acumula saldo a partir do patrimônio atual, na ordem de vencimento", () => {
    const status = cruzarComLancamentos([aluguel, luz], new Set(), "2026-08-01", "2026-08-01");
    const extrato = construirExtratoPrevisao(status, 500000, "2026-08-01");

    assert.equal(extrato.itens.length, 2);
    assert.equal(extrato.itens[0].recorrencia.id, "1"); // aluguel (dia 5) antes de luz (dia 15)
    assert.equal(extrato.itens[0].delta, -100000);
    assert.equal(extrato.itens[0].saldoProjetadoApos, 400000);
    assert.equal(extrato.itens[1].delta, -20000);
    assert.equal(extrato.itens[1].saldoProjetadoApos, 380000);
  });

  it("receita soma, despesa subtrai — mesma regra de calcularPrevisaoSaldo", () => {
    const status = cruzarComLancamentos([aluguel, salario], new Set(), "2026-08-01", "2026-08-01");
    const extrato = construirExtratoPrevisao(status, 100000, "2026-08-01");

    // aluguel (dia 5) primeiro, depois salário (dia 28)
    assert.equal(extrato.itens[0].saldoProjetadoApos, 0);
    assert.equal(extrato.itens[1].saldoProjetadoApos, 300000);
  });

  it("recorrência já lançada não entra no extrato nem na soma", () => {
    const idsLancados = new Set(["1"]);
    const status = cruzarComLancamentos([aluguel, luz], idsLancados, "2026-08-01", "2026-08-01");
    const extrato = construirExtratoPrevisao(status, 500000, "2026-08-01");

    assert.equal(extrato.itens.length, 1);
    assert.equal(extrato.itens[0].recorrencia.id, "3");
  });

  it("vencida e não lançada vai pra atrasadasForaDaPrevisao, não pro extrato normal", () => {
    // hoje é depois do vencimento do aluguel (dia 5) mas antes do de luz (dia 15)
    const status = cruzarComLancamentos([aluguel, luz], new Set(), "2026-08-01", "2026-08-10");
    const extrato = construirExtratoPrevisao(status, 500000, "2026-08-10");

    assert.equal(extrato.itens.length, 1);
    assert.equal(extrato.itens[0].recorrencia.id, "3");
    assert.equal(extrato.atrasadasForaDaPrevisao.length, 1);
    assert.equal(extrato.atrasadasForaDaPrevisao[0].recorrencia.id, "1");
  });

  it("sem recorrência nenhuma, extrato vazio e saldo intacto", () => {
    const extrato = construirExtratoPrevisao([], 42000, "2026-08-01");
    assert.deepEqual(extrato.itens, []);
    assert.deepEqual(extrato.atrasadasForaDaPrevisao, []);
  });
});
