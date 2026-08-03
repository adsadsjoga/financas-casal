import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { acharContraparte, agregarFluxoPorPessoa } from "@/lib/pessoas";
import type { CounterpartyKind } from "@/lib/database.types";

const joana = { id: "j", name: "Joana Palminha", kind: "familiar" as CounterpartyKind };
const kelly = { id: "k", name: "Kelly Pereira", kind: "cliente" as CounterpartyKind };

const aliases = [
  { counterparty_id: "j", pattern: "joana palminha" },
  { counterparty_id: "j", pattern: "joana filipa costa palminha" },
  { counterparty_id: "k", pattern: "kelly" },
];

describe("acharContraparte", () => {
  it("casa por substring na descrição normalizada", () => {
    assert.equal(acharContraparte("To Joana Palminha", aliases), "j");
    assert.equal(acharContraparte("Payment from KELLY CRISTINA DIAS", aliases), "k");
  });

  it("junta grafias diferentes na mesma pessoa", () => {
    assert.equal(acharContraparte("To Joana Palminha", aliases), "j");
    assert.equal(
      acharContraparte("Payment from JOANA FILIPA COSTA PALMINHA", aliases),
      "j",
    );
  });

  it("descrição sem contraparte conhecida devolve null", () => {
    assert.equal(acharContraparte("Tesco Express Limerick", aliases), null);
    assert.equal(acharContraparte("", aliases), null);
  });

  it("alias mais específico ganha do mais curto", () => {
    const ambiguos = [
      { counterparty_id: "curto", pattern: "gabriel" },
      { counterparty_id: "longo", pattern: "gabriel garcia de araujo" },
    ];
    assert.equal(acharContraparte("Transfer to Gabriel Garcia de Araujo", ambiguos), "longo");
    assert.equal(acharContraparte("Transfer to Gabriel Oliveira", ambiguos), "curto");
  });
});

describe("agregarFluxoPorPessoa", () => {
  it("separa recebido de enviado e calcula o líquido", () => {
    const r = agregarFluxoPorPessoa(
      [
        { type: "despesa", description: "To Joana Palminha", amount_primary_cents: 10000, occurred_on: "2026-03-01" },
        { type: "receita", description: "Payment from JOANA FILIPA COSTA PALMINHA", amount_primary_cents: 4000, occurred_on: "2026-04-01" },
      ],
      [joana, kelly],
      aliases,
    );

    assert.equal(r.length, 1);
    assert.equal(r[0].totalEnviado, 10000);
    assert.equal(r[0].totalRecebido, 4000);
    assert.equal(r[0].liquido, -6000);
    assert.equal(r[0].numTransacoes, 2);
    assert.equal(r[0].primeiraTransacao, "2026-03-01");
    assert.equal(r[0].ultimaTransacao, "2026-04-01");
  });

  it("transferência não entra — dobraria o valor de quem tem as duas pontas", () => {
    const r = agregarFluxoPorPessoa(
      [
        { type: "transferencia", description: "To Joana Palminha", amount_primary_cents: 50000, occurred_on: "2026-03-01" },
      ],
      [joana],
      aliases,
    );
    assert.equal(r.length, 0);
  });

  it("ordena por quem movimenta mais dinheiro, nos dois sentidos", () => {
    const r = agregarFluxoPorPessoa(
      [
        { type: "despesa", description: "To Joana Palminha", amount_primary_cents: 100, occurred_on: "2026-01-01" },
        { type: "receita", description: "From Kelly", amount_primary_cents: 900, occurred_on: "2026-01-02" },
      ],
      [joana, kelly],
      aliases,
    );
    assert.deepEqual(
      r.map((x) => x.nome),
      ["Kelly Pereira", "Joana Palminha"],
    );
  });

  it("ignora lançamento cuja contraparte não está cadastrada", () => {
    const r = agregarFluxoPorPessoa(
      [{ type: "despesa", description: "Tesco", amount_primary_cents: 500, occurred_on: "2026-01-01" }],
      [joana],
      aliases,
    );
    assert.equal(r.length, 0);
  });
});
