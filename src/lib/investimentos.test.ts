import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  agregarPosicoesPorAtivo,
  aplicarValorDeMercado,
  identificarAtivo,
  type PosicaoAtivo,
} from "@/lib/investimentos";

describe("identificarAtivo", () => {
  it("extrai o ticker de ações, FII e ETF", () => {
    assert.deepEqual(identificarAtivo("Compra de Ações - CASH3"), {
      ativo: "CASH3",
      tipo: "Ações",
    });
    assert.deepEqual(identificarAtivo("Compra de FII - CPTS11"), {
      ativo: "CPTS11",
      tipo: "FII",
    });
    assert.deepEqual(identificarAtivo("Compra de ETF - IVVB11"), {
      ativo: "IVVB11",
      tipo: "ETF",
    });
  });

  it("junta aplicação e resgate de RDB no mesmo ativo", () => {
    assert.equal(identificarAtivo("Aplicação RDB").ativo, "RDB");
    assert.equal(identificarAtivo("Resgate RDB").ativo, "RDB");
  });

  it("junta as duas grafias do Tesouro Direto", () => {
    assert.equal(identificarAtivo("Aplicação - Tesouro RendA+ 2065").ativo, "Tesouro Direto");
    assert.equal(identificarAtivo("IRRF sobre resgate - Tesouro Direto").ativo, "Tesouro Direto");
  });

  it("reconhece o rendimento automático do NuInvest", () => {
    assert.equal(identificarAtivo("Transferência de saldo NuInvest").ativo, "NuInvest");
  });

  it("descrição não reconhecida cai em 'Outros investimentos', não quebra", () => {
    assert.equal(identificarAtivo("Aplicação em investimento").ativo, "Outros investimentos");
    assert.equal(identificarAtivo("").ativo, "Outros investimentos");
  });
});

describe("agregarPosicoesPorAtivo", () => {
  it("aporte líquido = despesa (entrou no ativo) menos receita (saiu do ativo)", () => {
    const r = agregarPosicoesPorAtivo([
      { type: "despesa", description: "Compra de Ações - CASH3", amount_primary_cents: 10000 },
      { type: "despesa", description: "Compra de Ações - CASH3", amount_primary_cents: 5000 },
      { type: "receita", description: "Compra de Ações - CASH3", amount_primary_cents: 200 }, // rendimento minúsculo, visto na v2
    ]);

    assert.equal(r.length, 1);
    assert.equal(r[0].ativo, "CASH3");
    assert.equal(r[0].totalAportado, 15000);
    assert.equal(r[0].totalResgatado, 200);
    assert.equal(r[0].aportadoLiquido, 14800);
    assert.equal(r[0].numTransacoes, 3);
  });

  it("agrupa RDB de aplicações e resgates diferentes na mesma linha", () => {
    const r = agregarPosicoesPorAtivo([
      { type: "despesa", description: "Aplicação RDB", amount_primary_cents: 20000 },
      { type: "receita", description: "Resgate RDB", amount_primary_cents: 8000 },
    ]);
    assert.equal(r.length, 1);
    assert.equal(r[0].aportadoLiquido, 12000);
  });

  it("transferência não entra — não é aporte nem resgate de ativo", () => {
    const r = agregarPosicoesPorAtivo([
      { type: "transferencia", description: "Compra de Ações - CASH3", amount_primary_cents: 999 },
    ]);
    assert.equal(r.length, 0);
  });

  it("ordena do maior aporte líquido pro menor", () => {
    const r = agregarPosicoesPorAtivo([
      { type: "despesa", description: "Compra de FII - CPTS11", amount_primary_cents: 100 },
      { type: "despesa", description: "Aplicação RDB", amount_primary_cents: 900 },
    ]);
    assert.deepEqual(
      r.map((p) => p.ativo),
      ["RDB", "CPTS11"],
    );
  });
});

describe("aplicarValorDeMercado", () => {
  const posicaoCash3: PosicaoAtivo = {
    ativo: "CASH3",
    tipo: "Ações",
    aportadoLiquido: 10000, // R$100 já convertido pra moeda principal
    totalAportado: 10000,
    totalResgatado: 0,
    numTransacoes: 3,
  };
  const posicaoRdb: PosicaoAtivo = {
    ativo: "RDB",
    tipo: "Renda fixa",
    aportadoLiquido: 20000,
    totalAportado: 20000,
    totalResgatado: 0,
    numTransacoes: 2,
  };

  it("calcula valor de mercado convertendo preço BRL pra moeda principal", () => {
    const r = aplicarValorDeMercado(
      [posicaoCash3],
      new Map([["CASH3", 100]]), // 100 ações
      new Map([["CASH3", { preco: 4.6 }]]), // R$4,60 cada
      0.17, // BRL -> EUR
      // 100 * 4.6 * 0.17 = 78.2 EUR = 7820 cents
    );
    assert.equal(r[0].valorMercado, 7820);
    assert.equal(r[0].ganhoLiquido, 7820 - 10000);
  });

  it("sem quantidade cadastrada, valor de mercado fica null (não zero)", () => {
    const r = aplicarValorDeMercado(
      [posicaoCash3],
      new Map(), // ninguém informou quantidade
      new Map([["CASH3", { preco: 4.6 }]]),
      0.17,
    );
    assert.equal(r[0].quantidade, null);
    assert.equal(r[0].valorMercado, null);
    assert.equal(r[0].ganhoLiquido, null);
  });

  it("sem preço disponível (API fora do ar), fica null, não quebra", () => {
    const r = aplicarValorDeMercado(
      [posicaoCash3],
      new Map([["CASH3", 100]]),
      new Map(), // API não devolveu nada
      0.17,
    );
    assert.equal(r[0].valorMercado, null);
  });

  it("RDB nunca ganha valor de mercado, mesmo com quantidade avulsa no mapa", () => {
    const r = aplicarValorDeMercado(
      [posicaoRdb],
      new Map([["RDB", 500]]), // não devia nem existir, mas não pode vazar
      new Map([["RDB", { preco: 1 }]]),
      0.17,
    );
    assert.equal(r[0].quantidade, null);
    assert.equal(r[0].precoAtualBRL, null);
    assert.equal(r[0].valorMercado, null);
  });
});
