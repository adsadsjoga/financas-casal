import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  agruparPorContribuinte,
  diasAteOPrazo,
  progressoMeta,
  totalAportado,
} from "@/lib/goals";

describe("totalAportado", () => {
  it("soma aportes, inclusive correções negativas", () => {
    const r = totalAportado([
      { profile_id: "a", amount_cents: 1000 },
      { profile_id: "b", amount_cents: 500 },
      { profile_id: "a", amount_cents: -200 },
    ]);
    assert.equal(r, 1300);
  });
});

describe("progressoMeta", () => {
  it("calcula a proporção normal", () => {
    assert.equal(progressoMeta([{ profile_id: "a", amount_cents: 2500 }], 10000), 25);
  });
  it("nunca passa de 100 mesmo guardando mais que a meta", () => {
    assert.equal(progressoMeta([{ profile_id: "a", amount_cents: 15000 }], 10000), 100);
  });
  it("meta sem valor não quebra", () => {
    assert.equal(progressoMeta([], 0), 0);
  });
});

describe("agruparPorContribuinte", () => {
  it("soma por pessoa e ordena do maior para o menor", () => {
    const r = agruparPorContribuinte([
      { profile_id: "joao", amount_cents: 1000 },
      { profile_id: "maria", amount_cents: 3000 },
      { profile_id: "joao", amount_cents: 500 },
    ]);
    assert.deepEqual(r, [
      { profile_id: "maria", total: 3000 },
      { profile_id: "joao", total: 1500 },
    ]);
  });
});

describe("diasAteOPrazo", () => {
  it("conta dias até uma data futura", () => {
    assert.equal(diasAteOPrazo("2026-08-15", "2026-08-01"), 14);
  });
  it("fica negativo quando o prazo já passou", () => {
    assert.equal(diasAteOPrazo("2026-07-01", "2026-08-01"), -31);
  });
  it("sem prazo, retorna null", () => {
    assert.equal(diasAteOPrazo(null, "2026-08-01"), null);
  });
});
