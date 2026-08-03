/**
 * Posição por ativo, derivada das transações já categorizadas
 * "Investimentos" — sem tabela nova, mesmo padrão de `pessoas.ts` (que
 * também deriva tudo da descrição em vez de um cadastro à parte).
 *
 * Só dá pra medir APORTE LÍQUIDO (o que entrou menos o que saiu de cada
 * ativo), não valor de mercado hoje: o extrato do Nubank não traz
 * quantidade nem preço por cota/ação, só o valor total de cada compra. Ações
 * e FIIs têm cotação pública (dá pra buscar depois via brapi.dev), Tesouro
 * Direto também (Tesouro Transparente); RDB é produto exclusivo do Nubank,
 * sem fonte de preço nenhuma — misturar "alguns ativos com preço ao vivo,
 * outros sem" ficaria inconsistente, por isso todos ficam só no aporte por
 * enquanto.
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
