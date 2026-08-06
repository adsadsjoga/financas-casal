import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  agregarAlocacaoPorTipo,
  agregarAporteAcumuladoMensal,
  agregarAporteMensal,
  agregarDividendosMensal,
  agregarEvolucaoPatrimonial,
  agregarPosicoesPorAtivo,
  aplicarValorDeMercado,
  destaquesRentabilidade,
  identificarAtivo,
  projetarMediaMovel,
  type PosicaoAtivo,
  type PosicaoComMercado,
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

function posicao(overrides: Partial<PosicaoComMercado>): PosicaoComMercado {
  return {
    ativo: "X",
    tipo: "Ações",
    aportadoLiquido: 0,
    totalAportado: 0,
    totalResgatado: 0,
    numTransacoes: 1,
    quantidade: null,
    precoAtualBRL: null,
    valorMercado: null,
    ganhoLiquido: null,
    precoMedioBRL: null,
    ganhoPrecoMedio: null,
    ...overrides,
  };
}

describe("agregarAlocacaoPorTipo", () => {
  it("carteira vazia não gera fatia nenhuma", () => {
    assert.deepEqual(agregarAlocacaoPorTipo([]), []);
  });

  it("usa valor de mercado quando existe, aportado como proxy quando não", () => {
    const r = agregarAlocacaoPorTipo([
      posicao({ ativo: "CASH3", tipo: "Ações", aportadoLiquido: 10000, valorMercado: 12000 }),
      posicao({ ativo: "RDB", tipo: "Renda fixa", aportadoLiquido: 8000, valorMercado: null }),
    ]);
    assert.deepEqual(r, [
      { nome: "Ações", total: 12000 },
      { nome: "Renda fixa", total: 8000 },
    ]);
  });

  it("soma tipos iguais e ignora total <= 0", () => {
    const r = agregarAlocacaoPorTipo([
      posicao({ ativo: "CASH3", tipo: "Ações", aportadoLiquido: 5000, valorMercado: 5000 }),
      posicao({ ativo: "BBAS3", tipo: "Ações", aportadoLiquido: 3000, valorMercado: 3000 }),
      posicao({ ativo: "Outros", tipo: "Não identificado", aportadoLiquido: -100, valorMercado: null }),
    ]);
    assert.deepEqual(r, [{ nome: "Ações", total: 8000 }]);
  });

  it("resgate negativo abate aporte positivo do mesmo tipo, não é descartado à parte", () => {
    // RDB e Tesouro Direto são ambos "Renda fixa" — um resgate líquido no RDB
    // precisa abater o aporte do Tesouro dentro do mesmo tipo, não ficar de
    // fora da soma (senão o donut mostraria mais dinheiro do que existe).
    const r = agregarAlocacaoPorTipo([
      posicao({ ativo: "Tesouro Direto", tipo: "Renda fixa", aportadoLiquido: 10000, valorMercado: null }),
      posicao({ ativo: "RDB", tipo: "Renda fixa", aportadoLiquido: -4000, valorMercado: null }),
    ]);
    assert.deepEqual(r, [{ nome: "Renda fixa", total: 6000 }]);
  });
});

describe("destaquesRentabilidade", () => {
  it("carteira sem posição com mercado retorna tudo null", () => {
    const r = destaquesRentabilidade([posicao({ ativo: "RDB", aportadoLiquido: 1000 })]);
    assert.deepEqual(r, { melhor: null, pior: null, retornoTotalPercentual: null });
  });

  it("identifica melhor e pior desempenho em %", () => {
    const r = destaquesRentabilidade([
      posicao({ ativo: "CASH3", aportadoLiquido: 10000, valorMercado: 12000, ganhoLiquido: 2000 }), // +20%
      posicao({ ativo: "BBAS3", aportadoLiquido: 10000, valorMercado: 9000, ganhoLiquido: -1000 }), // -10%
    ]);
    assert.equal(r.melhor?.ativo, "CASH3");
    assert.ok(Math.abs((r.melhor?.percentual ?? 0) - 0.2) < 1e-9);
    assert.equal(r.pior?.ativo, "BBAS3");
    assert.ok(Math.abs((r.pior?.percentual ?? 0) - -0.1) < 1e-9);
    assert.ok(Math.abs((r.retornoTotalPercentual ?? 0) - 0.05) < 1e-9); // 1000/20000
  });

  it("com uma única posição, pior fica null pra não duplicar o melhor", () => {
    const r = destaquesRentabilidade([
      posicao({ ativo: "CASH3", aportadoLiquido: 10000, valorMercado: 12000, ganhoLiquido: 2000 }),
    ]);
    assert.equal(r.melhor?.ativo, "CASH3");
    assert.equal(r.pior, null);
  });
});

describe("agregarAporteAcumuladoMensal", () => {
  it("mês sem lançamento entra com zero, sem quebrar a série", () => {
    const r = agregarAporteAcumuladoMensal([], "2026-03-01", 3);
    assert.deepEqual(
      r.map((m) => m.mes),
      ["2026-01-01", "2026-02-01", "2026-03-01"],
    );
    assert.deepEqual(
      r.map((m) => m.acumulado),
      [0, 0, 0],
    );
  });

  it("acumula despesa (aporte) menos receita (resgate) mês a mês", () => {
    const r = agregarAporteAcumuladoMensal(
      [
        { type: "despesa", occurred_on: "2026-01-10", amount_primary_cents: 10000 },
        { type: "despesa", occurred_on: "2026-02-05", amount_primary_cents: 5000 },
        { type: "receita", occurred_on: "2026-03-01", amount_primary_cents: 2000 },
      ],
      "2026-03-01",
      3,
    );
    assert.deepEqual(
      r.map((m) => m.acumulado),
      [10000, 15000, 13000],
    );
  });

  it("transação fora da janela pedida não entra", () => {
    const r = agregarAporteAcumuladoMensal(
      [{ type: "despesa", occurred_on: "2025-01-01", amount_primary_cents: 10000 }],
      "2026-03-01",
      3,
    );
    assert.deepEqual(
      r.map((m) => m.acumulado),
      [0, 0, 0],
    );
  });
});

describe("agregarAporteMensal", () => {
  it("não acumula — cada mês é independente do anterior", () => {
    const r = agregarAporteMensal(
      [
        { type: "despesa", occurred_on: "2026-01-10", amount_primary_cents: 10000 },
        { type: "despesa", occurred_on: "2026-02-05", amount_primary_cents: 5000 },
        { type: "receita", occurred_on: "2026-03-01", amount_primary_cents: 2000 },
      ],
      "2026-03-01",
      3,
    );
    assert.deepEqual(
      r.map((m) => m.acumulado),
      [10000, 5000, -2000],
    );
  });
});

describe("agregarEvolucaoPatrimonial", () => {
  it("desfaz mês a mês a partir do patrimônio de hoje", () => {
    const r = agregarEvolucaoPatrimonial(
      100000,
      [
        { type: "receita", occurred_on: "2026-02-10", amount_primary_cents: 20000 },
        { type: "despesa", occurred_on: "2026-03-05", amount_primary_cents: 5000 },
      ],
      "2026-03-01",
      3,
    );
    // Âncora: hoje (fim da janela) = 100000, valor passado direto.
    // Desfazendo os -5000 de março: fim de fevereiro = 105000.
    // Desfazendo os +20000 de fevereiro: fim de janeiro = 85000.
    assert.deepEqual(
      r.map((p) => p.patrimonio),
      [85000, 105000, 100000],
    );
  });

  it("sem nenhuma transação, patrimônio fica constante em todos os meses", () => {
    const r = agregarEvolucaoPatrimonial(50000, [], "2026-03-01", 3);
    assert.deepEqual(
      r.map((p) => p.patrimonio),
      [50000, 50000, 50000],
    );
  });
});

describe("agregarDividendosMensal", () => {
  it("soma dividendos por mês, mês sem dividendo entra com zero", () => {
    const r = agregarDividendosMensal(
      [
        { amount_cents: 1000, paid_on: "2026-01-15" },
        { amount_cents: 500, paid_on: "2026-01-20" },
        { amount_cents: 800, paid_on: "2026-03-01" },
      ],
      "2026-03-01",
      3,
    );
    assert.deepEqual(
      r.map((m) => m.total),
      [1500, 0, 800],
    );
  });
});

describe("projetarMediaMovel", () => {
  const mes = (label: string, total: number) => ({ mes: label, label, total });

  it("faz média só dos meses com dado dentro da janela", () => {
    const dados = [mes("jan", 0), mes("fev", 100), mes("mar", 300)];
    assert.equal(projetarMediaMovel(dados, 3), 200);
  });

  it("sem nenhum mês com dado na janela, projeta zero", () => {
    const dados = [mes("jan", 0), mes("fev", 0)];
    assert.equal(projetarMediaMovel(dados, 3), 0);
  });
});
