import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calcularGasto, progressoOrcamento, statusOrcamento } from "@/lib/budgets";

describe("statusOrcamento", () => {
  it("abaixo de 90% é ok", () => {
    assert.equal(statusOrcamento(5000, 10000), "ok");
  });
  it("de 90% até 100% é perto", () => {
    assert.equal(statusOrcamento(9000, 10000), "perto");
    assert.equal(statusOrcamento(10000, 10000), "perto");
  });
  it("acima de 100% é estourou", () => {
    assert.equal(statusOrcamento(10001, 10000), "estourou");
  });
  it("limite zero ou negativo não quebra, fica ok", () => {
    assert.equal(statusOrcamento(500, 0), "ok");
  });
});

describe("progressoOrcamento", () => {
  it("nunca passa de 100 mesmo estourando o limite", () => {
    assert.equal(progressoOrcamento(25000, 10000), 100);
  });
  it("calcula a proporção normal", () => {
    assert.equal(progressoOrcamento(2500, 10000), 25);
  });
});

describe("calcularGasto", () => {
  const base = { category_id: "cat-mercado", scope: "casal" as const, profile_id: null };

  it("orçamento do casal soma independente de quem pagou", () => {
    const r = calcularGasto(
      [
        { type: "despesa", category_id: "cat-mercado", payer_profile_id: "joao", amount_primary_cents: 1000 },
        { type: "despesa", category_id: "cat-mercado", payer_profile_id: "maria", amount_primary_cents: 2000 },
      ],
      base,
    );
    assert.equal(r, 3000);
  });

  it("orçamento pessoal só conta quem pagou, não quem cadastrou", () => {
    const orcamentoDeJoao = { category_id: "cat-mercado", scope: "pessoal" as const, profile_id: "joao" };
    const r = calcularGasto(
      [
        { type: "despesa", category_id: "cat-mercado", payer_profile_id: "joao", amount_primary_cents: 1000 },
        { type: "despesa", category_id: "cat-mercado", payer_profile_id: "maria", amount_primary_cents: 2000 },
      ],
      orcamentoDeJoao,
    );
    assert.equal(r, 1000);
  });

  it("ignora categoria diferente e receita", () => {
    const r = calcularGasto(
      [
        { type: "despesa", category_id: "outra", payer_profile_id: null, amount_primary_cents: 5000 },
        { type: "receita", category_id: "cat-mercado", payer_profile_id: null, amount_primary_cents: 5000 },
      ],
      base,
    );
    assert.equal(r, 0);
  });
});
