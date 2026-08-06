import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  agruparSaldoPorCategoria,
  calcularSaldoAcerto,
  calcularShares,
  escalarShares,
  filtrarSettlements,
  sugerirTransacoesParecidas,
  type TransacaoParaSugestao,
} from "@/lib/splits";
import type { Settlement } from "@/lib/database.types";

const membros = [
  { profile_id: "g", income_cents: 300000 },
  { profile_id: "j", income_cents: 100000 },
];

describe("calcularShares", () => {
  it("meio a meio divide sem perder centavo", () => {
    const r = calcularShares(1001, "equal", membros);
    assert.equal(r.reduce((a, s) => a + s.share_cents, 0), 1001);
  });

  it("pela renda faz quem ganha mais pagar mais", () => {
    const r = calcularShares(40000, "income", membros);
    const gabriel = r.find((s) => s.profile_id === "g")!;
    const joana = r.find((s) => s.profile_id === "j")!;
    assert.ok(gabriel.share_cents > joana.share_cents);
    assert.equal(gabriel.share_cents + joana.share_cents, 40000);
  });

  it("sem renda declarada cai para meio a meio em vez de dividir por zero", () => {
    const semRenda = [
      { profile_id: "g", income_cents: 0 },
      { profile_id: "j", income_cents: 0 },
    ];
    const r = calcularShares(10000, "income", semRenda);
    assert.deepEqual(
      r.map((s) => s.share_cents),
      [5000, 5000],
    );
  });

  it("'none' não gera divisão nenhuma", () => {
    assert.deepEqual(calcularShares(10000, "none", membros), []);
  });
});

describe("escalarShares", () => {
  it("mantém a proporção 70/30 ao reduzir o total", () => {
    // 70/30 de 10000 -> 7000/3000. Reduzindo pra 5000, deve continuar 70/30.
    const r = escalarShares({ g: 7000, j: 3000 }, 10000, 5000);
    assert.deepEqual(r, { g: 3500, j: 1500 });
  });

  it("a soma sempre bate com o novo valor, mesmo com arredondamento", () => {
    // 70/30 de 12726 (Vodafone €127,26) -> 8908.2/3817.8, arredonda torto.
    const r = escalarShares({ g: 8908, j: 3818 }, 12726, 6350);
    assert.equal(r.g + r.j, 6350);
  });

  it("o resto do arredondamento cai em quem já tinha o maior share", () => {
    const r = escalarShares({ maior: 9000, menor: 1000 }, 10000, 3333);
    assert.equal(r.maior + r.menor, 3333);
    assert.ok(r.maior > r.menor);
  });

  it("valor original zero ou negativo devolve os shares sem mexer", () => {
    const original = { g: 5000, j: 5000 };
    assert.deepEqual(escalarShares(original, 0, 3000), original);
  });
});

describe("calcularSaldoAcerto", () => {
  const ledger = [
    { payer_profile_id: "g", debtor_profile_id: "j", share_cents: 5000 },
    { payer_profile_id: "j", debtor_profile_id: "g", share_cents: 2000 },
  ];

  it("positivo quer dizer que o perfilA tem a receber", () => {
    assert.equal(calcularSaldoAcerto(ledger, [], "g", "j"), 3000);
    assert.equal(calcularSaldoAcerto(ledger, [], "j", "g"), -3000);
  });

  it("um acerto pago abate o saldo", () => {
    const settlements = [{ from_profile: "j", to_profile: "g", amount_cents: 3000 }];
    assert.equal(calcularSaldoAcerto(ledger, settlements, "g", "j"), 0);
  });
});

describe("filtrarSettlements", () => {
  const base: Omit<Settlement, "id" | "note" | "settled_on"> = {
    couple_id: "c",
    from_profile: "g",
    to_profile: "j",
    amount_cents: 1000,
    created_by: "g",
    transaction_id: null,
    created_at: "2026-01-01T00:00:00Z",
  };
  const settlements: Settlement[] = [
    { ...base, id: "1", note: "Pix do mercado", settled_on: "2026-01-15" },
    { ...base, id: "2", note: "Dinheiro", settled_on: "2026-03-10" },
    { ...base, id: "3", note: "", settled_on: "2026-06-20" },
  ];

  it("sem filtro devolve tudo", () => {
    assert.equal(filtrarSettlements(settlements, {}).length, 3);
  });

  it("busca por texto da nota, sem diferenciar maiúscula", () => {
    const r = filtrarSettlements(settlements, { termo: "PIX" });
    assert.deepEqual(
      r.map((s) => s.id),
      ["1"],
    );
  });

  it("filtra por intervalo de datas, inclusivo nas pontas", () => {
    const r = filtrarSettlements(settlements, { desde: "2026-03-10", ate: "2026-06-20" });
    assert.deepEqual(
      r.map((s) => s.id),
      ["2", "3"],
    );
  });
});

describe("agruparSaldoPorCategoria", () => {
  const categorias = [
    { id: "c1", name: "Mercado", icon: "🛒" },
    { id: "c2", name: "Moradia", icon: "🏠" },
  ];

  it("soma por categoria mantendo o sinal de calcularSaldoAcerto", () => {
    const r = agruparSaldoPorCategoria(
      [
        { category_id: "c1", payer_profile_id: "g", debtor_profile_id: "j", share_cents: 5000 },
        { category_id: "c2", payer_profile_id: "j", debtor_profile_id: "g", share_cents: 2000 },
      ],
      categorias,
      "g",
      "j",
    );

    assert.deepEqual(
      r.map((x) => [x.nome, x.saldo]),
      [
        ["Mercado", 5000],
        ["Moradia", -2000],
      ],
    );
  });

  it("a soma das fatias bate com o saldo bruto do ledger", () => {
    const ledger = [
      { category_id: "c1", payer_profile_id: "g", debtor_profile_id: "j", share_cents: 5000 },
      { category_id: "c2", payer_profile_id: "j", debtor_profile_id: "g", share_cents: 2000 },
    ];
    const fatias = agruparSaldoPorCategoria(ledger, categorias, "g", "j");
    const somaFatias = fatias.reduce((acc, f) => acc + f.saldo, 0);
    assert.equal(somaFatias, calcularSaldoAcerto(ledger, [], "g", "j"));
  });

  it("categoria nula vira 'Sem categoria'", () => {
    const r = agruparSaldoPorCategoria(
      [{ category_id: null, payer_profile_id: "g", debtor_profile_id: "j", share_cents: 700 }],
      categorias,
      "g",
      "j",
    );
    assert.equal(r[0].nome, "Sem categoria");
  });

  it("categoria que se anula não polui a lista", () => {
    const r = agruparSaldoPorCategoria(
      [
        { category_id: "c1", payer_profile_id: "g", debtor_profile_id: "j", share_cents: 1000 },
        { category_id: "c1", payer_profile_id: "j", debtor_profile_id: "g", share_cents: 1000 },
      ],
      categorias,
      "g",
      "j",
    );
    assert.equal(r.length, 0);
  });

  it("ordena pelo peso, independente do sinal", () => {
    const r = agruparSaldoPorCategoria(
      [
        { category_id: "c1", payer_profile_id: "g", debtor_profile_id: "j", share_cents: 100 },
        { category_id: "c2", payer_profile_id: "j", debtor_profile_id: "g", share_cents: 900 },
      ],
      categorias,
      "g",
      "j",
    );
    assert.deepEqual(
      r.map((x) => x.nome),
      ["Moradia", "Mercado"],
    );
  });
});

describe("sugerirTransacoesParecidas", () => {
  const t = (id: string, amount_cents: number, occurred_on = "2026-08-10"): TransacaoParaSugestao => ({
    id,
    type: "receita",
    description: `tx ${id}`,
    amount_cents,
    occurred_on,
    account_id: "acc1",
  });

  it("acha lançamento com valor exatamente igual", () => {
    const r = sugerirTransacoesParecidas([t("a", 10000), t("b", 50000)], 10000);
    assert.deepEqual(
      r.map((x) => x.id),
      ["a"],
    );
  });

  it("aceita dentro da tolerância (5% ou R$5, o que for maior)", () => {
    // 5% de 10000 = 500 -> 10450 está dentro, 10600 está fora
    const r = sugerirTransacoesParecidas([t("dentro", 10450), t("fora", 10600)], 10000);
    assert.deepEqual(
      r.map((x) => x.id),
      ["dentro"],
    );
  });

  it("valor pequeno usa o piso de R$5 (500 centavos), não 5%", () => {
    // 5% de 1000 = 50, mas o piso de 500 é maior -> 1400 ainda entra
    const r = sugerirTransacoesParecidas([t("a", 1400)], 1000);
    assert.equal(r.length, 1);
  });

  it("ordena do mais próximo pro mais distante", () => {
    const r = sugerirTransacoesParecidas([t("longe", 10450), t("perto", 10050)], 10000);
    assert.deepEqual(
      r.map((x) => x.id),
      ["perto", "longe"],
    );
  });

  it("respeita o limite pedido", () => {
    const r = sugerirTransacoesParecidas([t("a", 10000), t("b", 10000), t("c", 10000)], 10000, 2);
    assert.equal(r.length, 2);
  });

  it("valor alvo zero ou negativo não sugere nada", () => {
    assert.deepEqual(sugerirTransacoesParecidas([t("a", 10000)], 0), []);
    assert.deepEqual(sugerirTransacoesParecidas([t("a", 10000)], -500), []);
  });
});
