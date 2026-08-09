import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calcularUsoPorPagamento,
  contaRecebimentoId,
  pagamentoCombinaComDivida,
} from "@/lib/acerto";

describe("contaRecebimentoId", () => {
  it("usa a conta da receita e o destino da transferencia", () => {
    assert.equal(
      contaRecebimentoId({ type: "receita", account_id: "recebedora", transfer_account_id: null }),
      "recebedora",
    );
    assert.equal(
      contaRecebimentoId({
        type: "transferencia",
        account_id: "origem",
        transfer_account_id: "destino",
      }),
      "destino",
    );
  });
});

describe("pagamentoCombinaComDivida", () => {
  const donos = new Map<string, string | null>([
    ["conta-g", "g"],
    ["conta-j", "j"],
    ["conjunta", null],
  ]);

  it("aceita receita recebida na conta do credor", () => {
    assert.equal(
      pagamentoCombinaComDivida(
        { type: "receita", account_id: "conta-g", transfer_account_id: null },
        donos,
        "j",
        "g",
      ),
      true,
    );
  });

  it("exige origem do devedor e destino do credor numa transferencia", () => {
    assert.equal(
      pagamentoCombinaComDivida(
        { type: "transferencia", account_id: "conta-j", transfer_account_id: "conta-g" },
        donos,
        "j",
        "g",
      ),
      true,
    );
    assert.equal(
      pagamentoCombinaComDivida(
        { type: "transferencia", account_id: "conta-j", transfer_account_id: "conjunta" },
        donos,
        "j",
        "g",
      ),
      false,
    );
  });
});

describe("calcularUsoPorPagamento", () => {
  it("soma itens de settlements itemizados e o valor dos avulsos", () => {
    const uso = calcularUsoPorPagamento(
      [
        { id: "s1", transaction_id: "p1", amount_cents: 9999 },
        { id: "s2", transaction_id: "p1", amount_cents: 2000 },
        { id: "s3", transaction_id: null, amount_cents: 5000 },
      ],
      [
        { settlement_id: "s1", amount_cents: 1000 },
        { settlement_id: "s1", amount_cents: 1500 },
      ],
    );

    assert.equal(uso.get("p1"), 4500);
    assert.equal(uso.size, 1);
  });
});
