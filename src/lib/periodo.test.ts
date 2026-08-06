import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolverPeriodo, resolverPeriodoComparativo } from "@/lib/periodo";

describe("resolverPeriodo", () => {
  it("modo mes (padrão) usa o mês pedido, fim exclusivo no mês seguinte", () => {
    const p = resolverPeriodo({ mes: "2026-08-14" });
    assert.equal(p.modo, "mes");
    assert.equal(p.de, "2026-08-01");
    assert.equal(p.ateExclusivo, "2026-09-01");
    assert.equal(p.referencia, "2026-08-01");
  });

  it("sem parâmetro nenhum cai no mês atual, não quebra", () => {
    const p = resolverPeriodo({});
    assert.equal(p.modo, "mes");
    assert.match(p.de, /^\d{4}-\d{2}-01$/);
  });

  it("modo ano cobre o ano inteiro, fim exclusivo no ano seguinte", () => {
    const p = resolverPeriodo({ modo: "ano", ano: "2025" });
    assert.equal(p.de, "2025-01-01");
    assert.equal(p.ateExclusivo, "2026-01-01");
    assert.equal(p.referencia, "2025");
  });

  it("modo dia cobre só aquele dia, fim exclusivo no dia seguinte", () => {
    const p = resolverPeriodo({ modo: "dia", dia: "2026-08-14" });
    assert.equal(p.de, "2026-08-14");
    assert.equal(p.ateExclusivo, "2026-08-15");
  });

  it("modo dia em fim de mês avança corretamente pro mês seguinte", () => {
    const p = resolverPeriodo({ modo: "dia", dia: "2026-08-31" });
    assert.equal(p.ateExclusivo, "2026-09-01");
  });

  it("modo intervalo cobre de/ate inclusive nas duas pontas", () => {
    const p = resolverPeriodo({ modo: "intervalo", de: "2026-01-15", ate: "2026-03-10" });
    assert.equal(p.de, "2026-01-15");
    assert.equal(p.ateExclusivo, "2026-03-11");
    assert.equal(p.ateIntervalo, "2026-03-10");
  });

  it("modo intervalo com ate antes de de não gera range invertido", () => {
    const p = resolverPeriodo({ modo: "intervalo", de: "2026-03-10", ate: "2026-01-15" });
    assert.equal(p.de, "2026-03-10");
    assert.equal(p.ateIntervalo, "2026-03-10");
    assert.equal(p.ateExclusivo, "2026-03-11");
  });

  it("parâmetro malformado cai no padrão em vez de quebrar", () => {
    const p = resolverPeriodo({ modo: "dia", dia: "lixo" });
    assert.match(p.de, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("resolverPeriodoComparativo", () => {
  it("mes-atual e mes-anterior são meses consecutivos", () => {
    const atual = resolverPeriodoComparativo("mes-atual", "2026-08-14");
    const anterior = resolverPeriodoComparativo("mes-anterior", "2026-08-14");
    assert.equal(atual.de, "2026-08-01");
    assert.equal(atual.ateExclusivo, "2026-09-01");
    assert.equal(anterior.de, "2026-07-01");
    assert.equal(anterior.ateExclusivo, "2026-08-01");
  });

  it("semestre-atual cobre jan-jun quando hoje está no primeiro semestre", () => {
    const p = resolverPeriodoComparativo("semestre-atual", "2026-03-10");
    assert.equal(p.de, "2026-01-01");
    assert.equal(p.ateExclusivo, "2026-07-01");
  });

  it("semestre-atual cobre jul-dez quando hoje está no segundo semestre", () => {
    const p = resolverPeriodoComparativo("semestre-atual", "2026-09-10");
    assert.equal(p.de, "2026-07-01");
    assert.equal(p.ateExclusivo, "2027-01-01");
  });

  it("semestre-anterior recua 6 meses do início do semestre atual", () => {
    const p = resolverPeriodoComparativo("semestre-anterior", "2026-03-10");
    assert.equal(p.de, "2025-07-01");
    assert.equal(p.ateExclusivo, "2026-01-01");
  });

  it("ano-atual e ano-anterior cobrem o ano civil inteiro", () => {
    const atual = resolverPeriodoComparativo("ano-atual", "2026-05-01");
    const anterior = resolverPeriodoComparativo("ano-anterior", "2026-05-01");
    assert.deepEqual(atual, { de: "2026-01-01", ateExclusivo: "2027-01-01", label: "2026" });
    assert.deepEqual(anterior, { de: "2025-01-01", ateExclusivo: "2026-01-01", label: "2025" });
  });
});
