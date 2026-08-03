import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { escapeHtml, renderizarEmailResumo } from "@/lib/resumo-mensal";

describe("escapeHtml", () => {
  it("escapa os cinco caracteres perigosos", () => {
    assert.equal(
      escapeHtml(`<img src=x onerror="alert(1)"> & 'aspas'`),
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;aspas&#39;",
    );
  });

  it("texto normal passa direto", () => {
    assert.equal(escapeHtml("Mercado São Paulo"), "Mercado São Paulo");
  });
});

describe("renderizarEmailResumo", () => {
  const base = {
    coupleName: "Nossa casa",
    mes: "2026-08-01",
    moeda: "EUR",
    entradas: 400000,
    saidas: 350000,
    maioresDespesas: [{ description: "Mercado", amount_cents: 12000 }],
    orcamentosEstourados: [{ categoria: "Lazer", icone: "🎉", gasto: 15000, limite: 10000 }],
    metas: [{ nome: "Viagem", icone: "✈️", progresso: 40, total: 40000, alvo: 100000 }],
    appUrl: "https://financas-casal-one-iota.vercel.app",
  };

  it("nunca deixa uma descrição maliciosa virar HTML de verdade", () => {
    const html = renderizarEmailResumo({
      ...base,
      maioresDespesas: [{ description: "<script>alert(1)</script>", amount_cents: 500 }],
    });
    assert.equal(html.includes("<script>alert(1)</script>"), false);
    assert.equal(html.includes("&lt;script&gt;"), true);
  });

  it("escapa o nome do casal também", () => {
    const html = renderizarEmailResumo({ ...base, coupleName: "<b>x</b>" });
    assert.equal(html.includes("<b>x</b>"), false);
    assert.equal(html.includes("&lt;b&gt;x&lt;/b&gt;"), true);
  });

  it("gera HTML com tags balanceadas (contagem de abre/fecha table e tr)", () => {
    const html = renderizarEmailResumo(base);
    const abrTable = (html.match(/<table/g) ?? []).length;
    const fecTable = (html.match(/<\/table>/g) ?? []).length;
    assert.equal(abrTable, fecTable);
    const abrTr = (html.match(/<tr/g) ?? []).length;
    const fecTr = (html.match(/<\/tr>/g) ?? []).length;
    assert.equal(abrTr, fecTr);
  });

  it("omite a seção quando a lista está vazia, não deixa cabeçalho solto", () => {
    const html = renderizarEmailResumo({ ...base, orcamentosEstourados: [] });
    assert.equal(html.includes("Orçamentos estourados"), false);
  });

  it("mostra os valores formatados na moeda certa", () => {
    const html = renderizarEmailResumo(base);
    assert.match(html, /€\s?4\.000,00/);
  });
});
