import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resumirProjetos } from "@/lib/projetos";

const projetos = [
  { id: "p1", name: "Viagem Cork", icon: "✈️", archived: false },
  { id: "p2", name: "Casamento", icon: "💍", archived: false },
];

describe("resumirProjetos", () => {
  it("soma despesas de categorias diferentes no mesmo projeto", () => {
    const r = resumirProjetos(
      [
        { id: "t1", type: "despesa", amount_primary_cents: 40000 }, // voo
        { id: "t2", type: "despesa", amount_primary_cents: 15000 }, // hotel
        { id: "t3", type: "despesa", amount_primary_cents: 3000 }, // jantar
      ],
      [
        { project_id: "p1", transaction_id: "t1" },
        { project_id: "p1", transaction_id: "t2" },
        { project_id: "p1", transaction_id: "t3" },
      ],
      projetos,
    );

    const cork = r.find((p) => p.projectId === "p1")!;
    assert.equal(cork.totalGasto, 58000);
    assert.equal(cork.custoLiquido, 58000);
    assert.equal(cork.numTransacoes, 3);
  });

  it("receita vinculada abate o custo, não vira linha separada", () => {
    const r = resumirProjetos(
      [
        { id: "t1", type: "despesa", amount_primary_cents: 40000 },
        { id: "t2", type: "receita", amount_primary_cents: 12000 }, // reembolso
      ],
      [
        { project_id: "p1", transaction_id: "t1" },
        { project_id: "p1", transaction_id: "t2" },
      ],
      projetos,
    );

    const cork = r.find((p) => p.projectId === "p1")!;
    assert.equal(cork.totalGasto, 40000);
    assert.equal(cork.totalRecebido, 12000);
    assert.equal(cork.custoLiquido, 28000);
  });

  it("transferência não conta como custo de projeto", () => {
    const r = resumirProjetos(
      [{ id: "t1", type: "transferencia", amount_primary_cents: 99999 }],
      [{ project_id: "p1", transaction_id: "t1" }],
      projetos,
    );
    const cork = r.find((p) => p.projectId === "p1")!;
    assert.equal(cork.custoLiquido, 0);
    assert.equal(cork.numTransacoes, 0);
  });

  it("a mesma transação pode entrar em dois projetos", () => {
    const r = resumirProjetos(
      [{ id: "t1", type: "despesa", amount_primary_cents: 5000 }],
      [
        { project_id: "p1", transaction_id: "t1" },
        { project_id: "p2", transaction_id: "t1" },
      ],
      projetos,
    );
    assert.equal(r.find((p) => p.projectId === "p1")!.custoLiquido, 5000);
    assert.equal(r.find((p) => p.projectId === "p2")!.custoLiquido, 5000);
  });

  it("projeto sem lançamento aparece zerado, não some", () => {
    const r = resumirProjetos([], [], projetos);
    assert.equal(r.length, 2);
    assert.equal(r[0].custoLiquido, 0);
  });

  it("vínculo para transação fora da janela é ignorado sem quebrar", () => {
    const r = resumirProjetos(
      [{ id: "t1", type: "despesa", amount_primary_cents: 1000 }],
      [
        { project_id: "p1", transaction_id: "t1" },
        { project_id: "p1", transaction_id: "fora-da-janela" },
      ],
      projetos,
    );
    assert.equal(r.find((p) => p.projectId === "p1")!.numTransacoes, 1);
  });

  it("ordena do projeto mais caro para o mais barato", () => {
    const r = resumirProjetos(
      [
        { id: "t1", type: "despesa", amount_primary_cents: 100 },
        { id: "t2", type: "despesa", amount_primary_cents: 900 },
      ],
      [
        { project_id: "p1", transaction_id: "t1" },
        { project_id: "p2", transaction_id: "t2" },
      ],
      projetos,
    );
    assert.deepEqual(
      r.map((p) => p.nome),
      ["Casamento", "Viagem Cork"],
    );
  });
});
