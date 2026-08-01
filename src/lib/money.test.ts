import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatBRL, parseBRL, splitCents, sumCents } from "@/lib/money";
import { addMesesMantendoDia, diasNoMes } from "@/lib/dates";
import { calcularSaldoAcerto, calcularShares } from "@/lib/splits";

describe("parseBRL", () => {
  it("lê os formatos que os bancos brasileiros cospem", () => {
    assert.equal(parseBRL("1.234,56"), 123456);
    assert.equal(parseBRL("1234,56"), 123456);
    assert.equal(parseBRL("1234.56"), 123456);
    assert.equal(parseBRL("R$ 1.234,56"), 123456);
    assert.equal(parseBRL("0,01"), 1);
    assert.equal(parseBRL("50"), 5000);
  });

  it("entende ponto de milhar sem decimais", () => {
    assert.equal(parseBRL("1.500"), 150000);
    assert.equal(parseBRL("1.234.567"), 123456700);
  });

  it("entende negativos, inclusive nas convenções de extrato", () => {
    assert.equal(parseBRL("-50,00"), -5000);
    assert.equal(parseBRL("(50,00)"), -5000);
    assert.equal(parseBRL("1.234,56-"), -123456);
  });

  it("arredonda quando vêm mais de 2 casas", () => {
    assert.equal(parseBRL("10,999"), 1100);
    assert.equal(parseBRL("10,994"), 1099);
  });

  it("devolve null em vez de chutar zero", () => {
    assert.equal(parseBRL(""), null);
    assert.equal(parseBRL("abc"), null);
    assert.equal(parseBRL("R$"), null);
    assert.equal(parseBRL(null), null);
  });
});

describe("splitCents", () => {
  it("nunca perde nem inventa centavo", () => {
    for (const total of [1, 7, 10, 99, 100, 3333, 100000, 123457]) {
      for (const partes of [2, 3, 4, 7]) {
        const r = splitCents(total, new Array(partes).fill(1));
        assert.equal(sumCents(r), total, `${total} em ${partes}`);
        assert.equal(r.length, partes);
      }
    }
  });

  it("divide R$ 10,00 em 3 como 4 + 3 + 3", () => {
    assert.deepEqual(splitCents(1000, [1, 1, 1]), [334, 333, 333]);
  });

  it("fecha a conta também no negativo", () => {
    const r = splitCents(-999, [1, 1]);
    assert.equal(sumCents(r), -999);
  });

  it("respeita proporção de renda", () => {
    // 3.000 e 1.000 de renda -> 75% / 25%
    const r = splitCents(100000, [300000, 100000]);
    assert.deepEqual(r, [75000, 25000]);
    assert.equal(sumCents(r), 100000);
  });

  it("aguenta valores altos com pesos grandes sem estourar o inteiro", () => {
    const r = splitCents(100_000_000_00, [1_234_567, 7_654_321]);
    assert.equal(sumCents(r), 100_000_000_00);
  });
});

describe("calcularShares", () => {
  const membros = [
    { profile_id: "a", income_cents: 500000 },
    { profile_id: "b", income_cents: 300000 },
  ];

  it("meio a meio fecha exato mesmo em valor ímpar", () => {
    const r = calcularShares(999, "equal", membros);
    assert.equal(sumCents(r.map((s) => s.share_cents)), 999);
  });

  it("pela renda cobra mais de quem ganha mais", () => {
    const r = calcularShares(80000, "income", membros);
    assert.equal(r[0].share_cents, 50000);
    assert.equal(r[1].share_cents, 30000);
  });

  it("sem renda declarada, cai para meio a meio em vez de dividir por zero", () => {
    const semRenda = [
      { profile_id: "a", income_cents: 0 },
      { profile_id: "b", income_cents: 0 },
    ];
    const r = calcularShares(10000, "income", semRenda);
    assert.deepEqual(
      r.map((s) => s.share_cents),
      [5000, 5000],
    );
  });

  it("custom torto ainda fecha com o valor da despesa", () => {
    const r = calcularShares(10000, "custom", membros, { a: 3000, b: 3000 });
    assert.equal(sumCents(r.map((s) => s.share_cents)), 10000);
  });

  it("não divide quando o modo é none", () => {
    assert.deepEqual(calcularShares(10000, "none", membros), []);
  });
});

describe("calcularSaldoAcerto", () => {
  it("soma o que um deve ao outro e desconta o que já foi pago", () => {
    const ledger = [
      { payer_profile_id: "a", debtor_profile_id: "b", share_cents: 5000 },
      { payer_profile_id: "b", debtor_profile_id: "a", share_cents: 2000 },
    ];
    // A pagou 50 que era de B; B pagou 20 que era de A -> B deve 30 a A.
    assert.equal(calcularSaldoAcerto(ledger, [], "a", "b"), 3000);

    // B já passou 30 para A -> quitado.
    const quitado = calcularSaldoAcerto(
      ledger,
      [{ from_profile: "b", to_profile: "a", amount_cents: 3000 }],
      "a",
      "b",
    );
    assert.equal(quitado, 0);
  });
});

describe("datas", () => {
  it("parcela de compra do dia 31 não gera data inexistente", () => {
    assert.equal(addMesesMantendoDia("2026-01-31", 1), "2026-02-28");
    assert.equal(addMesesMantendoDia("2026-01-31", 3), "2026-04-30");
    assert.equal(addMesesMantendoDia("2026-01-15", 1), "2026-02-15");
  });

  it("acerta fevereiro de ano bissexto", () => {
    assert.equal(diasNoMes("2028-02-01"), 29);
    assert.equal(addMesesMantendoDia("2028-01-31", 1), "2028-02-29");
  });

  it("vira o ano corretamente", () => {
    assert.equal(addMesesMantendoDia("2026-12-31", 1), "2027-01-31");
  });
});

describe("formatBRL", () => {
  it("formata em real", () => {
    assert.match(formatBRL(123456), /1\.234,56/);
    assert.match(formatBRL(-5000), /50,00/);
  });
});
