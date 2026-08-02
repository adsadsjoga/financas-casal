import type { ParsedRow } from "./types";

/**
 * OFX é SGML, não XML: tags costumam vir sem fechamento
 * (`<NAME>Mercado`, sem `</NAME>`). Por isso a extração é por regex —
 * "conteúdo da tag até a próxima tag ou fim de linha" — em vez de um parser
 * XML de verdade, que rejeitaria a maioria dos arquivos reais de banco.
 */
function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>\\s*([^<\r\n]*)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

/** "20260115120000[-3:GMT]" ou "20260115" -> "2026-01-15" */
function parseOfxDate(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 8) return null;
  const ano = digits.slice(0, 4);
  const mes = digits.slice(4, 6);
  const dia = digits.slice(6, 8);
  if (mes < "01" || mes > "12" || dia < "01" || dia > "31") return null;
  return `${ano}-${mes}-${dia}`;
}

export function parseOfx(texto: string): ParsedRow[] {
  const blocos = texto.split(/<STMTTRN>/i).slice(1);
  const linhas: ParsedRow[] = [];

  for (const bloco of blocos) {
    const corpo = bloco.split(/<\/STMTTRN>/i)[0];

    const data = parseOfxDate(extractTag(corpo, "DTPOSTED"));
    const valorRaw = extractTag(corpo, "TRNAMT");
    if (!data || valorRaw === null) continue;

    // O OFX sempre usa ponto como separador decimal, não depende de locale.
    const amountCents = Math.round(parseFloat(valorRaw.replace(",", ".")) * 100);
    if (!Number.isFinite(amountCents) || amountCents === 0) continue;

    const nome = extractTag(corpo, "NAME");
    const memo = extractTag(corpo, "MEMO");
    const descricao = [nome, memo].filter((s) => s && s !== nome).length
      ? [nome, memo].filter(Boolean).join(" — ")
      : (nome ?? memo ?? "(sem descrição)");

    const fitid = extractTag(corpo, "FITID");

    linhas.push({ date: data, amountCents, description: descricao, externalId: fitid || null });
  }

  return linhas;
}
