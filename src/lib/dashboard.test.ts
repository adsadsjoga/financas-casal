import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { agregarDespesasPorCategoria, agregarFluxoMensal } from "@/lib/dashboard";

describe("agregarFluxoMensal", () => {
  it("preenche os 6 meses mesmo quando algum não tem lançamento", () => {
    const r = agregarFluxoMensal(
      [
        { type: "receita", occurred_on: "2026-08-05", amount_primary_cents: 100000 },
        { type: "despesa", occurred_on: "2026-08-10", amount_primary_cents: 40000 },
        // junho (2 meses antes de agosto) fica sem nenhum lançamento
        { type: "receita", occurred_on: "2026-05-01", amount_primary_cents: 50000 },
      ],
      "2026-08-01",
      6,
    );

    assert.equal(r.length, 6);
    assert.deepEqual(
      r.map((x) => x.mes),
      ["2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01"],
    );

    const junho = r.find((x) => x.mes === "2026-06-01")!;
    assert.deepEqual(junho, { mes: "2026-06-01", label: "jun/26", entradas: 0, saidas: 0 });

    const agosto = r.find((x) => x.mes === "2026-08-01")!;
    assert.equal(agosto.entradas, 100000);
    assert.equal(agosto.saidas, 40000);
  });

  it("ignora lançamentos fora da janela pedida", () => {
    const r = agregarFluxoMensal(
      [{ type: "despesa", occurred_on: "2020-01-01", amount_primary_cents: 999 }],
      "2026-08-01",
      6,
    );
    const total = r.reduce((acc, m) => acc + m.saidas, 0);
    assert.equal(total, 0);
  });

  it("transferência não conta nem como entrada nem como saída", () => {
    const r = agregarFluxoMensal(
      [{ type: "transferencia", occurred_on: "2026-08-05", amount_primary_cents: 5000 }],
      "2026-08-01",
      1,
    );
    assert.equal(r[0].entradas, 0);
    assert.equal(r[0].saidas, 0);
  });
});

describe("agregarDespesasPorCategoria", () => {
  const categorias = [
    { id: "c1", name: "Mercado", icon: "🛒" },
    { id: "c2", name: "Moradia", icon: "🏠" },
  ];

  it("soma por categoria e ordena do maior para o menor", () => {
    const r = agregarDespesasPorCategoria(
      [
        { type: "despesa", category_id: "c1", amount_primary_cents: 1000 },
        { type: "despesa", category_id: "c2", amount_primary_cents: 5000 },
        { type: "despesa", category_id: "c1", amount_primary_cents: 500 },
        { type: "receita", category_id: "c1", amount_primary_cents: 999999 }, // não deve entrar
      ],
      categorias,
    );

    assert.deepEqual(
      r.map((x) => [x.nome, x.total]),
      [
        ["Moradia", 5000],
        ["Mercado", 1500],
      ],
    );
  });

  it("categoria nula vira 'Sem categoria', não some", () => {
    const r = agregarDespesasPorCategoria(
      [{ type: "despesa", category_id: null, amount_primary_cents: 100 }],
      categorias,
    );
    assert.equal(r[0].nome, "Sem categoria");
    assert.equal(r[0].total, 100);
  });

  it("dobra o rabo em 'Outras' além do limite", () => {
    const muitas = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      name: `Categoria ${i}`,
      icon: "📦",
    }));
    const transacoes = muitas.map((c, i) => ({
      type: "despesa",
      category_id: c.id,
      // valores decrescentes: c0 é a maior, c9 a menor
      amount_primary_cents: (10 - i) * 100,
    }));

    const r = agregarDespesasPorCategoria(transacoes, muitas, 3);

    assert.equal(r.length, 4); // 3 principais + "Outras"
    assert.equal(r[3].nome, "Outras");
    // Outras = soma de c3..c9 = (7+6+5+4+3+2+1)*100 = 2800
    assert.equal(r[3].total, 2800);
  });
});
