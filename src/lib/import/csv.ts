import Papa from "papaparse";

export type FormatoData = "DMY" | "MDY" | "YMD";

export interface MapeamentoCsv {
  dataCol: number;
  descCol: number;
  valorCol: number;
  /**
   * Coluna com o ID único do lançamento, quando o banco fornece (o Nubank
   * chama de "Identificador"). Vira `external_id`, que é dedup exato — sem
   * ele sobra só o fingerprint, que é palpite.
   */
  idCol?: number;
  inverterSinal: boolean;
  formatoData: FormatoData;
  temCabecalho: boolean;
}

export function parseCsvLinhas(texto: string): string[][] {
  const resultado = Papa.parse<string[]>(texto, { skipEmptyLines: true });
  return resultado.data;
}

/**
 * Converte a coluna de data para YYYY-MM-DD conforme o formato escolhido.
 * Aceita separador `/`, `-` ou `.`, e ano com 2 ou 4 dígitos.
 */
export function parseDataColuna(raw: string, formato: FormatoData): string | null {
  const limpo = raw.trim();
  if (!limpo) return null;

  const isoMatch = limpo.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const partes = limpo.split(/[/\-.]/).map((p) => p.trim());
  if (partes.length !== 3) return null;

  let dia: string, mes: string, ano: string;
  if (formato === "YMD") [ano, mes, dia] = partes;
  else if (formato === "MDY") [mes, dia, ano] = partes;
  else [dia, mes, ano] = partes;

  if (ano.length === 2) ano = (Number(ano) > 50 ? "19" : "20") + ano;

  const d = Number(dia);
  const m = Number(mes);
  const y = Number(ano);
  if (!d || !m || !y || d > 31 || m > 12) return null;

  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Tenta adivinhar qual coluna é qual, pelo nome do cabeçalho. */
export function sugerirColunas(cabecalho: string[]) {
  const acha = (padrao: RegExp) => cabecalho.findIndex((h) => padrao.test(h));
  return {
    dataCol: acha(/data|date/i),
    descCol: acha(/desc|hist|memo|name|estabelecimento|merchant/i),
    valorCol: acha(/valor|amount|montante|value/i),
    // `\b` nas duas pontas para "id" não casar com "identificador do
    // recebedor" nem com qualquer coluna que só contenha as letras i-d.
    idCol: acha(/^identificador$|\bid\b|fitid|transaction.?id/i),
  };
}
