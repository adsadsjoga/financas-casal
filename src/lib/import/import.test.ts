import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { parseOfx } from "./ofx";
import { parseCsvLinhas, parseDataColuna, sugerirColunas } from "./csv";
import { computeFingerprint, normalizeDescription } from "./normalize";
import { isLikelyInternalTransfer, suggestCategoryId, type ImportCategory } from "./categorize";

const AQUI = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(AQUI, "__fixtures__");

describe("sugerirColunas", () => {
  it("acha as quatro colunas no cabeçalho real do Nubank", () => {
    const r = sugerirColunas(["Data", "Valor", "Identificador", "Descrição"]);
    assert.equal(r.dataCol, 0);
    assert.equal(r.valorCol, 1);
    assert.equal(r.idCol, 2);
    assert.equal(r.descCol, 3);
  });

  it("extrato sem coluna de ID devolve -1, não um palpite errado", () => {
    const r = sugerirColunas(["Data", "Histórico", "Valor"]);
    assert.equal(r.idCol, -1);
  });

  it("não confunde 'Identificador do recebedor' com o ID do lançamento", () => {
    const r = sugerirColunas(["Data", "Descrição", "Valor", "Identificador do recebedor"]);
    assert.equal(r.idCol, -1);
  });

  it("reconhece FITID do OFX exportado como CSV", () => {
    const r = sugerirColunas(["date", "memo", "amount", "FITID"]);
    assert.equal(r.idCol, 3);
  });
});

describe("parseOfx", () => {
  it("lê lançamentos de um extrato OFX real", () => {
    const texto = readFileSync(resolve(FIXTURES, "extrato.ofx"), "utf-8");
    const linhas = parseOfx(texto);

    assert.equal(linhas.length, 2);

    assert.deepEqual(linhas[0], {
      date: "2026-08-05",
      amountCents: -1850,
      description: "Circle K Gas Station",
      externalId: "TXN-0001",
    });
    assert.deepEqual(linhas[1], {
      date: "2026-08-06",
      amountCents: 150000,
      description: "Payment from Client",
      externalId: "TXN-0002",
    });
  });

  it("ignora bloco sem data ou sem valor", () => {
    const texto = `<STMTTRN><NAME>Sem data nem valor</STMTTRN>`;
    assert.deepEqual(parseOfx(texto), []);
  });

  it("aceita fuso horário colado na data", () => {
    const texto = `<STMTTRN><DTPOSTED>20260115120000[-3:GMT]<TRNAMT>-10.00<NAME>Teste</STMTTRN>`;
    const [linha] = parseOfx(texto);
    assert.equal(linha.date, "2026-01-15");
  });
});

describe("parseCsvLinhas + parseDataColuna (extrato CSV com duplicata real)", () => {
  it("interpreta data DMY, valor com sinal, e preserva a duplicata proposital", () => {
    const texto = readFileSync(resolve(FIXTURES, "extrato.csv"), "utf-8");
    const linhas = parseCsvLinhas(texto);
    const dados = linhas.slice(1); // pula cabeçalho

    assert.equal(dados.length, 4);

    const datas = dados.map((l) => parseDataColuna(l[0], "DMY"));
    assert.deepEqual(datas, ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-03"]);

    assert.equal(dados[2][1], "ALDI STORES");
    assert.equal(dados[3][1], "ALDI STORES");
    assert.equal(dados[2][2], dados[3][2]); // mesmo valor -> linha 3 é duplicata da 2
  });

  it("rejeita data com mês fora de 1-12", () => {
    assert.equal(parseDataColuna("35/13/2026", "DMY"), null);
  });

  it("expande ano de 2 dígitos", () => {
    assert.equal(parseDataColuna("05/08/26", "DMY"), "2026-08-05");
  });
});

describe("dedup dentro do mesmo arquivo (a lógica de montarPreview)", () => {
  it("a 2ª linha idêntica no mesmo lote vira duplicata, mesmo sem nada no banco ainda", () => {
    // Replica a checagem "visto no lote" de importar/actions.ts: nenhuma das
    // duas ALDI existe no banco, mas a segunda repete a fingerprint da
    // primeira dentro do próprio arquivo — sem essa checagem, as duas
    // seriam gravadas como se fossem lançamentos diferentes.
    const contaId = "11111111-1111-1111-1111-111111111111";
    const linhas = [
      { date: "2026-08-03", amountCents: 3215, type: "despesa" as const, description: "ALDI STORES" },
      { date: "2026-08-03", amountCents: 3215, type: "despesa" as const, description: "ALDI STORES" },
    ];
    const fingerprints = linhas.map((l) =>
      computeFingerprint(contaId, l.date, l.amountCents, l.type, l.description),
    );

    assert.equal(fingerprints[0], fingerprints[1]);

    const vistos = new Set<string>();
    const duplicadas = fingerprints.map((fp) => {
      const dup = vistos.has(fp);
      vistos.add(fp);
      return dup;
    });

    assert.deepEqual(duplicadas, [false, true]);
  });
});

describe("normalizeDescription", () => {
  it("casa com o resultado do normalize_description() do Postgres", () => {
    assert.equal(normalizeDescription("PAG*IFOOD  São Paulo 123"), "pag ifood sao paulo 123");
  });
});


describe("categorizar importacao", () => {
  const categorias: ImportCategory[] = [
    { id: "receita-rendimentos", name: "Rendimentos", kind: "receita" },
    { id: "despesa-mercado", name: "Mercado", kind: "despesa" },
    { id: "despesa-outras", name: "Outras despesas", kind: "despesa" },
    { id: "receita-outras", name: "Outras receitas", kind: "receita" },
  ];

  it("sugere categoria por estabelecimento conhecido", () => {
    assert.equal(suggestCategoryId("Tesco", "despesa", categorias), "despesa-mercado");
  });

  it("sugere rendimentos para juros da Revolut", () => {
    assert.equal(
      suggestCategoryId("Net Interest Paid to 'Reserva' for Oct 3, 2024", "receita", categorias),
      "receita-rendimentos",
    );
  });

  it("marca vaults e bolsos Revolut como provavel transferencia interna", () => {
    assert.equal(isLikelyInternalTransfer("From EUR Reserva"), true);
    assert.equal(isLikelyInternalTransfer("Savings Vault topup"), true);
  });
});
