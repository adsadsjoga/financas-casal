import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calcularPrevisaoSaldo, cruzarComLancamentos, diaEfetivoDoMes } from "@/lib/fixas";

describe("diaEfetivoDoMes", () => {
  it("mantém o dia em mês normal", () => {
    assert.equal(diaEfetivoDoMes("2026-08-01", 15), "2026-08-15");
  });
  it("trava no último dia em mês curto", () => {
    assert.equal(diaEfetivoDoMes("2026-02-01", 31), "2026-02-28");
  });
});

describe("cruzarComLancamentos", () => {
  const base = { id: "r1", type: "despesa", amount_cents: 5000, day_of_month: 10, active: true };

  it("marca como lançada quando o id está no conjunto do mês", () => {
    const r = cruzarComLancamentos([base], new Set(["r1"]), "2026-08-01", "2026-08-15");
    assert.equal(r[0].lancada, true);
    assert.equal(r[0].atrasada, false);
  });

  it("marca como atrasada quando venceu e ainda não foi lançada", () => {
    const r = cruzarComLancamentos([base], new Set(), "2026-08-01", "2026-08-15");
    assert.equal(r[0].vencimento, "2026-08-10");
    assert.equal(r[0].lancada, false);
    assert.equal(r[0].atrasada, true);
  });

  it("não marca atrasada se o vencimento ainda não chegou", () => {
    const futura = { ...base, day_of_month: 20 };
    const r = cruzarComLancamentos([futura], new Set(), "2026-08-01", "2026-08-15");
    assert.equal(r[0].atrasada, false);
  });

  it("ignora recorrentes inativas", () => {
    const inativa = { ...base, active: false };
    const r = cruzarComLancamentos([inativa], new Set(), "2026-08-01", "2026-08-15");
    assert.equal(r.length, 0);
  });

  it("ordena por data de vencimento", () => {
    const r = cruzarComLancamentos(
      [
        { ...base, id: "dia20", day_of_month: 20 },
        { ...base, id: "dia05", day_of_month: 5 },
      ],
      new Set(),
      "2026-08-01",
      "2026-08-01",
    );
    assert.deepEqual(r.map((x) => x.recorrencia.id), ["dia05", "dia20"]);
  });
});

describe("calcularPrevisaoSaldo", () => {
  it("soma receita pendente e subtrai despesa pendente, ambas futuras", () => {
    const status = cruzarComLancamentos(
      [
        { id: "salario", type: "receita", amount_cents: 300000, day_of_month: 25, active: true },
        { id: "aluguel", type: "despesa", amount_cents: 100000, day_of_month: 20, active: true },
      ],
      new Set(),
      "2026-08-01",
      "2026-08-10",
    );
    const r = calcularPrevisaoSaldo(50000, status, "2026-08-10");
    assert.equal(r, 50000 + 300000 - 100000);
  });

  it("não conta o que já foi lançado (já está no patrimônio atual)", () => {
    const status = cruzarComLancamentos(
      [{ id: "aluguel", type: "despesa", amount_cents: 100000, day_of_month: 20, active: true }],
      new Set(["aluguel"]),
      "2026-08-01",
      "2026-08-10",
    );
    const r = calcularPrevisaoSaldo(50000, status, "2026-08-10");
    assert.equal(r, 50000);
  });

  it("não conta o que já venceu e ficou pra trás sem ser lançado", () => {
    const status = cruzarComLancamentos(
      [{ id: "luz", type: "despesa", amount_cents: 8000, day_of_month: 5, active: true }],
      new Set(),
      "2026-08-01",
      "2026-08-20",
    );
    const r = calcularPrevisaoSaldo(50000, status, "2026-08-20");
    assert.equal(r, 50000);
  });
});
