export interface ResumoProjeto {
  projectId: string;
  nome: string;
  icone: string;
  archived: boolean;
  /** Despesas vinculadas ao projeto. */
  totalGasto: number;
  /** Receitas vinculadas (reembolso, venda de algo do projeto). */
  totalRecebido: number;
  /** Gasto menos recebido — o custo real do projeto. */
  custoLiquido: number;
  numTransacoes: number;
}

/**
 * Soma o que cada projeto custou até agora.
 *
 * Receita vinculada abate o custo em vez de virar linha separada: um voo de
 * 400 reembolsado em 120 custou 280, e mostrar "gastou 400" ao lado de
 * "recebeu 120" faria a pessoa fazer a conta de cabeça toda vez.
 */
export function resumirProjetos(
  transacoes: Array<{ id: string; type: string; amount_primary_cents: number }>,
  vinculos: Array<{ project_id: string; transaction_id: string }>,
  projetos: Array<{ id: string; name: string; icon: string; archived: boolean }>,
): ResumoProjeto[] {
  const porTransacao = new Map(transacoes.map((t) => [t.id, t]));

  const resumos = new Map<string, ResumoProjeto>(
    projetos.map((p) => [
      p.id,
      {
        projectId: p.id,
        nome: p.name,
        icone: p.icon,
        archived: p.archived,
        totalGasto: 0,
        totalRecebido: 0,
        custoLiquido: 0,
        numTransacoes: 0,
      },
    ]),
  );

  for (const vinculo of vinculos) {
    const resumo = resumos.get(vinculo.project_id);
    if (!resumo) continue;

    const t = porTransacao.get(vinculo.transaction_id);
    // Transação fora da janela consultada (ou invisível por RLS) não entra —
    // mas o vínculo continua existindo no banco.
    if (!t) continue;

    if (t.type === "despesa") resumo.totalGasto += t.amount_primary_cents;
    else if (t.type === "receita") resumo.totalRecebido += t.amount_primary_cents;
    else continue; // transferência não é custo de projeto

    resumo.numTransacoes += 1;
  }

  for (const resumo of resumos.values()) {
    resumo.custoLiquido = resumo.totalGasto - resumo.totalRecebido;
  }

  return [...resumos.values()].sort((a, b) => b.custoLiquido - a.custoLiquido);
}
