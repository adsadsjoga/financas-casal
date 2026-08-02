import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeInvoiceMonth, estimativaVencimento, faturaAbertaHoje } from "@/lib/invoices";

describe("computeInvoiceMonth", () => {
  it("compra antes do fechamento cai na fatura do mês corrente", () => {
    assert.equal(computeInvoiceMonth(28, "2026-08-15"), "2026-08-01");
  });

  it("compra no dia do fechamento ou depois cai na fatura seguinte", () => {
    assert.equal(computeInvoiceMonth(28, "2026-08-28"), "2026-09-01");
    assert.equal(computeInvoiceMonth(28, "2026-08-31"), "2026-09-01");
  });

  it("vira o ano quando o fechamento empurra para janeiro", () => {
    assert.equal(computeInvoiceMonth(28, "2026-12-30"), "2027-01-01");
  });

  it("sem dia de fechamento configurado, usa o mês da compra", () => {
    assert.equal(computeInvoiceMonth(null, "2026-08-15"), "2026-08-01");
  });
});

describe("faturaAbertaHoje", () => {
  it("é a mesma conta compute_invoice_month aplicada a hoje", () => {
    assert.equal(faturaAbertaHoje(28, "2026-08-15"), "2026-08-01");
    assert.equal(faturaAbertaHoje(28, "2026-08-28"), "2026-09-01");
  });
});

describe("estimativaVencimento", () => {
  it("vencimento depois do fechamento cai no mês seguinte (padrão mais comum)", () => {
    // fecha dia 28, vence dia 5 -> vence no mês depois da fatura
    assert.equal(estimativaVencimento("2026-08-01", 28, 5), "2026-09-05");
  });

  it("vencimento antes do fechamento cai no mesmo mês da fatura", () => {
    // fecha dia 5, vence dia 20 -> mesmo mês
    assert.equal(estimativaVencimento("2026-08-01", 5, 20), "2026-08-20");
  });

  it("trava no último dia do mês quando o vencimento não existe", () => {
    // fecha dia 31, vence dia 29 -> cai no mês seguinte (fevereiro, que só
    // tem 28 dias em 2026) -> trava em 28, não estoura para março.
    assert.equal(estimativaVencimento("2026-01-01", 31, 29), "2026-02-28");
  });
});
