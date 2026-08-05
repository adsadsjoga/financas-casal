/**
 * Posição por ativo, derivada das transações já categorizadas
 * "Investimentos" — sem tabela nova, mesmo padrão de `pessoas.ts` (que
 * também deriva tudo da descrição em vez de um cadastro à parte).
 *
 * Base é APORTE LÍQUIDO (o que entrou menos o que saiu de cada ativo) — o
 * extrato do Nubank não traz quantidade nem preço por cota/ação, só o valor
 * total de cada compra. Ações/FII/ETF ganham VALOR DE MERCADO por cima disso
 * (ver `aplicarValorDeMercado`), a partir de quantidade informada à mão
 * (`investment_holdings`) × preço ao vivo (`precos-mercado.ts`, brapi.dev).
 * Tesouro Direto e RDB ficam só no aporte: Tesouro tem cotação pública mas
 * "2065" do Nubank não bate com nenhum vencimento oficial (os reais são
 * 2064/2069), e RDB é produto exclusivo do Nubank sem preço público nenhum —
 * misturar "alguns com preço ao vivo, outros sem" ficaria inconsistente.
 */

import { addMeses, mesCurto, primeiroDiaDoMes } from "@/lib/dates";

export interface PosicaoAtivo {
  ativo: string;
  tipo: string;
  /** Positivo = você tem dinheiro líquido metido ali; negativo é raro (resgatou mais do que aportou registrado). */
  aportadoLiquido: number;
  totalAportado: number;
  totalResgatado: number;
  numTransacoes: number;
}

const TIPO_LEGIVEL: Record<string, string> = {
  "ações": "Ações",
  "acoes": "Ações",
  fii: "FII",
  etf: "ETF",
};

/**
 * Identifica ativo e tipo a partir da descrição do extrato. Só chamar com
 * transações que já vieram da categoria "Investimentos" — o fallback
 * genérico assume isso.
 */
export function identificarAtivo(descricao: string): { ativo: string; tipo: string } {
  const desc = descricao.trim();

  const compra = desc.match(/^compra de (ações|acoes|fii|etf)\s*-\s*(\S+)$/i);
  if (compra) {
    const chaveTipo = compra[1].toLowerCase();
    return { ativo: compra[2].toUpperCase(), tipo: TIPO_LEGIVEL[chaveTipo] ?? compra[1] };
  }

  if (/rdb/i.test(desc)) {
    return { ativo: "RDB", tipo: "Renda fixa" };
  }

  if (/tesouro/i.test(desc)) {
    // "Aplicação - Tesouro RendA+ 2065" e "IRRF sobre resgate - Tesouro
    // Direto" são o mesmo ativo com sufixos diferentes — junta num bucket só.
    return { ativo: "Tesouro Direto", tipo: "Renda fixa" };
  }

  if (/nuinvest/i.test(desc)) {
    return { ativo: "NuInvest", tipo: "Rendimento automático" };
  }

  return { ativo: "Outros investimentos", tipo: "Não identificado" };
}

export function agregarPosicoesPorAtivo(
  transacoes: Array<{ type: string; description: string; amount_primary_cents: number }>,
): PosicaoAtivo[] {
  const porAtivo = new Map<string, PosicaoAtivo>();

  for (const t of transacoes) {
    if (t.type !== "receita" && t.type !== "despesa") continue;

    const { ativo, tipo } = identificarAtivo(t.description);
    let posicao = porAtivo.get(ativo);
    if (!posicao) {
      posicao = {
        ativo,
        tipo,
        aportadoLiquido: 0,
        totalAportado: 0,
        totalResgatado: 0,
        numTransacoes: 0,
      };
      porAtivo.set(ativo, posicao);
    }

    // Despesa = dinheiro saiu da conta pra dentro do ativo (aporte).
    // Receita = voltou pra conta (resgate, juros, devolução).
    if (t.type === "despesa") posicao.totalAportado += t.amount_primary_cents;
    else posicao.totalResgatado += t.amount_primary_cents;

    posicao.numTransacoes += 1;
  }

  for (const posicao of porAtivo.values()) {
    posicao.aportadoLiquido = posicao.totalAportado - posicao.totalResgatado;
  }

  return [...porAtivo.values()].sort((a, b) => b.aportadoLiquido - a.aportadoLiquido);
}

/** Tipos com cotação pública confiável via brapi.dev — só esses ganham valor de mercado. */
export const TIPOS_NEGOCIAVEIS_B3 = new Set(["Ações", "FII", "ETF"]);

export interface PosicaoComMercado extends PosicaoAtivo {
  quantidade: number | null;
  precoAtualBRL: number | null;
  /** Em centavos, na moeda principal do casal — não em BRL bruto. */
  valorMercado: number | null;
  /** valorMercado - aportadoLiquido; null quando não há valor de mercado. */
  ganhoLiquido: number | null;
}

/**
 * Junta a posição (aporte líquido) com quantidade informada à mão e preço ao
 * vivo, convertendo pra moeda principal do casal — o preço vem em BRL, mas
 * `aportadoLiquido` já está em `amount_primary_cents` (moeda do casal), então
 * misturar sem converter compararia grandezas diferentes.
 */
export function aplicarValorDeMercado(
  posicoes: PosicaoAtivo[],
  quantidades: Map<string, number>,
  precos: Map<string, { preco: number }>,
  taxaBrlParaPrimaria: number,
): PosicaoComMercado[] {
  return posicoes.map((posicao) => {
    const negociavel = TIPOS_NEGOCIAVEIS_B3.has(posicao.tipo);
    const quantidade = negociavel ? (quantidades.get(posicao.ativo) ?? null) : null;
    const precoAtualBRL = negociavel ? (precos.get(posicao.ativo)?.preco ?? null) : null;

    let valorMercado: number | null = null;
    if (quantidade !== null && quantidade > 0 && precoAtualBRL !== null) {
      valorMercado = Math.round(quantidade * precoAtualBRL * taxaBrlParaPrimaria * 100);
    }

    return {
      ...posicao,
      quantidade,
      precoAtualBRL,
      valorMercado,
      ganhoLiquido: valorMercado === null ? null : valorMercado - posicao.aportadoLiquido,
    };
  });
}

export interface FatiaAlocacao {
  nome: string;
  total: number;
}

/**
 * Peso de cada tipo (Ações/FII/ETF/Renda fixa/...) na carteira. Usa valor de
 * mercado quando existe, aportado líquido como proxy quando não (renda fixa
 * e ativos sem quantidade informada) — sem isso a fatia sumiria do donut.
 * Soma TODOS os ativos do tipo primeiro (um resgate parcial negativo, ex.
 * RDB, precisa abater o Tesouro Direto dentro do mesmo "Renda fixa") e só
 * depois descarta tipos cujo líquido ficou ≤ 0 — fatia negativa não desenha.
 */
export function agregarAlocacaoPorTipo(posicoes: PosicaoComMercado[]): FatiaAlocacao[] {
  const porTipo = new Map<string, number>();

  for (const p of posicoes) {
    const valor = p.valorMercado ?? p.aportadoLiquido;
    porTipo.set(p.tipo, (porTipo.get(p.tipo) ?? 0) + valor);
  }

  return [...porTipo.entries()]
    .filter(([, total]) => total > 0)
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total);
}

export interface DestaquesRentabilidade {
  melhor: { ativo: string; percentual: number } | null;
  pior: { ativo: string; percentual: number } | null;
  /** Retorno total da carteira: soma dos ganhos / soma do aportado, só entre quem tem valor de mercado. */
  retornoTotalPercentual: number | null;
}

/**
 * Melhor e pior desempenho em %, e retorno total da carteira — só entre
 * posições com valor de mercado (as únicas com "preço vivo" pra comparar
 * contra o aportado). Aportado líquido ≤ 0 fica fora: percentual sobre base
 * zero ou negativa não tem leitura útil.
 */
export function destaquesRentabilidade(posicoes: PosicaoComMercado[]): DestaquesRentabilidade {
  const comMercado = posicoes.filter(
    (p): p is PosicaoComMercado & { ganhoLiquido: number } =>
      p.ganhoLiquido !== null && p.aportadoLiquido > 0,
  );

  if (comMercado.length === 0) {
    return { melhor: null, pior: null, retornoTotalPercentual: null };
  }

  const comPercentual = comMercado.map((p) => ({
    ativo: p.ativo,
    percentual: p.ganhoLiquido / p.aportadoLiquido,
  }));

  const melhor = comPercentual.reduce((a, b) => (b.percentual > a.percentual ? b : a));
  const pior = comPercentual.reduce((a, b) => (b.percentual < a.percentual ? b : a));

  const totalAportado = comMercado.reduce((acc, p) => acc + p.aportadoLiquido, 0);
  const totalGanho = comMercado.reduce((acc, p) => acc + p.ganhoLiquido, 0);

  return {
    melhor,
    pior: pior.ativo === melhor.ativo ? null : pior,
    retornoTotalPercentual: totalAportado > 0 ? totalGanho / totalAportado : null,
  };
}

export interface AporteMensal {
  /** Primeiro dia do mês, YYYY-MM-DD. */
  mes: string;
  /** Rótulo curto para o eixo, ex. "ago/26". */
  label: string;
  /** Aporte líquido acumulado desde o início da série até este mês (inclusive). */
  acumulado: number;
}

/**
 * Aporte líquido acumulado mês a mês, para os últimos `meses` terminando em
 * `mesFinal` (incluído). Não é valor de mercado — brapi.dev só dá preço
 * atual, sem histórico — é quanto dinheiro entrou/saiu da carteira ao longo
 * do tempo, acumulado. Mesmo esqueleto de `agregarFluxoMensal` em
 * `dashboard.ts` (baldes por mês, mês vazio entra com zero).
 */
export function agregarAporteAcumuladoMensal(
  transacoes: Array<{ type: string; occurred_on: string; amount_primary_cents: number }>,
  mesFinal: string,
  meses: number,
): AporteMensal[] {
  const inicio = addMeses(primeiroDiaDoMes(mesFinal), -(meses - 1));

  const porMes = new Map<string, number>();
  for (let i = 0; i < meses; i++) {
    porMes.set(addMeses(inicio, i), 0);
  }

  for (const t of transacoes) {
    if (t.type !== "receita" && t.type !== "despesa") continue;
    const mes = primeiroDiaDoMes(t.occurred_on);
    if (!porMes.has(mes)) continue; // fora da janela pedida
    const delta = t.type === "despesa" ? t.amount_primary_cents : -t.amount_primary_cents;
    porMes.set(mes, (porMes.get(mes) ?? 0) + delta);
  }

  let acumulado = 0;
  return [...porMes.entries()].map(([mes, delta]) => {
    acumulado += delta;
    return { mes, label: mesCurto(mes), acumulado };
  });
}
