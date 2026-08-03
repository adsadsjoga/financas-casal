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
