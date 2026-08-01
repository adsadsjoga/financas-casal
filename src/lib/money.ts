/**
 * Dinheiro no app é SEMPRE inteiro, em centavos.
 * Nenhum valor monetário passa por `number` fracionário ou `float` no banco.
 * Converta na borda (input do usuário / arquivo importado) e volte a formatar
 * só na hora de exibir.
 */

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const BRL_NO_SYMBOL = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 123456 -> "R$ 1.234,56" */
export function formatBRL(cents: number): string {
  return BRL.format(cents / 100);
}

/** 123456 -> "1.234,56" (para tabelas, onde o R$ vira ruído) */
export function formatAmount(cents: number): string {
  return BRL_NO_SYMBOL.format(cents / 100);
}

/** 1234567890 -> "R$ 12,3 mi" — para cartões de resumo em tela pequena */
export function formatCompactBRL(cents: number): string {
  const abs = Math.abs(cents);
  if (abs < 100_000_00) return formatBRL(cents);
  const value = cents / 100;
  const compact = new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  return `R$ ${compact}`;
}

/**
 * Converte texto digitado ou vindo de arquivo em centavos.
 * Retorna null quando não dá para interpretar com segurança — nunca "chuta" 0,
 * porque um zero silencioso num extrato é pior que uma linha rejeitada.
 *
 * Aceita: "1.234,56"  "1234,56"  "1234.56"  "R$ 1.234,56"  "-50"  "(50,00)"  "1 234,56"
 *
 * Ambiguidade do separador único:
 *   - só vírgula          -> decimal            ("1234,56" = 1234.56)
 *   - só ponto, 3 dígitos -> milhar             ("1.500"   = 1500,00)
 *   - só ponto, outro     -> decimal            ("1234.5"  = 1234.50)
 * A importação de CSV permite forçar o formato quando o banco fugir disso.
 */
export function parseBRL(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return Math.round(input * 100);
  }

  let s = input.trim();
  if (!s) return null;

  // (1.234,56) = negativo, convenção contábil comum em extratos
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }

  s = s.replace(/R\$/gi, "").replace(/\s| /g, "").trim();

  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  // Alguns bancos põem o sinal no fim: "1.234,56-"
  if (s.endsWith("-")) {
    negative = !negative;
    s = s.slice(0, -1);
  }

  if (!/^[\d.,]+$/.test(s)) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let decimalSep: "," | "." | null = null;

  if (lastComma >= 0 && lastDot >= 0) {
    decimalSep = lastComma > lastDot ? "," : ".";
  } else if (lastComma >= 0) {
    decimalSep = ",";
  } else if (lastDot >= 0) {
    decimalSep = s.length - lastDot - 1 === 3 ? null : ".";
  }

  let intPart: string;
  let fracPart = "";

  if (decimalSep === null) {
    intPart = s.replace(/[.,]/g, "");
  } else {
    const idx = s.lastIndexOf(decimalSep);
    intPart = s.slice(0, idx).replace(/[.,]/g, "");
    fracPart = s.slice(idx + 1).replace(/[.,]/g, "");
  }

  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) return null;
  if (intPart === "" && fracPart === "") return null;
  if (fracPart.length > 2) {
    // Mais de 2 casas: arredonda para o centavo mais próximo.
    const rounded = Math.round(Number(`0.${fracPart}`) * 100);
    const cents = Number(intPart || "0") * 100 + rounded;
    return negative ? -cents : cents;
  }

  const cents =
    Number(intPart || "0") * 100 + Number(fracPart.padEnd(2, "0") || "0");
  if (!Number.isFinite(cents)) return null;
  return negative ? -cents : cents;
}

/**
 * Reduz pesos arbitrários (ex.: rendas em centavos) a inteiros pequenos que
 * preservam a proporção, mantendo `splitCents` dentro do inteiro seguro.
 */
function normalizeWeights(weights: number[]): number[] {
  const clean = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const sum = clean.reduce((a, b) => a + b, 0);
  if (sum <= 0) return clean.map(() => 1);
  const scaled = clean.map((w) => Math.max(1, Math.round((w / sum) * 10_000)));
  return scaled;
}

/**
 * Divide `total` centavos entre N partes conforme os pesos, sem perder nem
 * inventar centavo: a soma do resultado é sempre exatamente `total`.
 * Usa o método do maior resto — os centavos que sobram vão para quem tem a
 * maior fração pendente (empate resolve pela ordem, para ser determinístico).
 *
 * splitCents(10000, [1, 1])    -> [5000, 5000]
 * splitCents(10, [1, 1, 1])    -> [4, 3, 3]
 * splitCents(-999, [1, 1])     -> [-500, -499]
 */
export function splitCents(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  if (!Number.isInteger(total)) {
    throw new Error(`splitCents espera centavos inteiros, recebeu ${total}`);
  }

  const w = normalizeWeights(weights);
  const sum = w.reduce((a, b) => a + b, 0);

  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);

  const numerators = w.map((x) => abs * x);
  const shares = numerators.map((x) => Math.floor(x / sum));
  const remainders = numerators.map((x) => x % sum);

  let left = abs - shares.reduce((a, b) => a + b, 0);
  const order = remainders
    .map((rem, i) => ({ rem, i }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i);

  for (let k = 0; left > 0 && k < order.length; k++, left--) {
    shares[order[k].i] += 1;
  }

  return shares.map((v) => v * sign);
}

/** Divisão igual entre N pessoas, sem centavo perdido. */
export function splitEqually(total: number, parts: number): number[] {
  return splitCents(total, new Array(parts).fill(1));
}

/** Soma segura de centavos. */
export function sumCents(values: Iterable<number>): number {
  let acc = 0;
  for (const v of values) acc += v;
  return acc;
}
