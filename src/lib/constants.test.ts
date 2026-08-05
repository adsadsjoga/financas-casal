import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { estaForaDoResultado } from "./constants";

describe("estaForaDoResultado", () => {
  test("reconhece a grafia canônica", () => {
    assert.equal(estaForaDoResultado("Transferências internas"), true);
    assert.equal(estaForaDoResultado("Saques e dinheiro"), true);
  });

  // O bug real: os scripts de importação criaram "Transferencias internas"
  // sem acento, e a comparação literal antiga deixava ~578 transações
  // (~70 mil EUR de cada lado) entrarem no resultado do dashboard.
  test("reconhece a grafia sem acento", () => {
    assert.equal(estaForaDoResultado("Transferencias internas"), true);
  });

  test("ignora diferença de caixa e espaço", () => {
    assert.equal(estaForaDoResultado("TRANSFERENCIAS INTERNAS"), true);
    assert.equal(estaForaDoResultado("  transferências   internas  "), true);
  });

  test("não confunde com categoria de resultado real", () => {
    assert.equal(estaForaDoResultado("Mercado"), false);
    assert.equal(estaForaDoResultado("Transferências pessoais"), false);
    assert.equal(estaForaDoResultado(""), false);
  });
});
