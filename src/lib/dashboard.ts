import { addMeses, mesCurto, primeiroDiaDoMes } from "@/lib/dates";

export interface FluxoMensal {
  /** Primeiro dia do mês, YYYY-MM-DD — chave estável para navegação/teste. */
  mes: string;
  /** Rótulo curto para o eixo, ex. "ago/26". */
  label: string;
  entradas: number;
  saidas: number;
}

/**
 * Agrupa transações em N meses consecutivos terminando em `mesFinal`
 * (incluído). Meses sem nenhum lançamento entram com zero — sem isso o
 * gráfico "encolheria" no eixo X toda vez que um mês ficasse vazio.
 */
export function agregarFluxoMensal(
  transacoes: Array<{ type: string; occurred_on: string; amount_primary_cents: number }>,
  mesFinal: string,
  meses: number,
): FluxoMensal[] {
  const inicio = addMeses(primeiroDiaDoMes(mesFinal), -(meses - 1));

  const baldes = new Map<string, FluxoMensal>();
  for (let i = 0; i < meses; i++) {
    const mes = addMeses(inicio, i);
    baldes.set(mes, { mes, label: mesCurto(mes), entradas: 0, saidas: 0 });
  }

  for (const t of transacoes) {
    const mes = primeiroDiaDoMes(t.occurred_on);
    const balde = baldes.get(mes);
    if (!balde) continue; // fora da janela pedida
    if (t.type === "receita") balde.entradas += t.amount_primary_cents;
    else if (t.type === "despesa") balde.saidas += t.amount_primary_cents;
  }

  return [...baldes.values()];
}

export interface FatiaCategoria {
  categoryId: string | null;
  nome: string;
  icone: string;
  total: number;
}

/**
 * Soma despesas por categoria e dobra o rabo em "Outras" além de `limite`
 * categorias — uma lista de 16 categorias vira ilegível, e cor não separa
 * mais que ~8 fatias mesmo quando bem escolhida.
 */
export function agregarDespesasPorCategoria(
  transacoes: Array<{ type: string; category_id: string | null; amount_primary_cents: number }>,
  categorias: Array<{ id: string; name: string; icon: string }>,
  limite = 7,
): FatiaCategoria[] {
  const nomes = new Map(categorias.map((c) => [c.id, c]));
  const somas = new Map<string, number>();

  for (const t of transacoes) {
    if (t.type !== "despesa") continue;
    const chave = t.category_id ?? "(sem-categoria)";
    somas.set(chave, (somas.get(chave) ?? 0) + t.amount_primary_cents);
  }

  const linhas: FatiaCategoria[] = [...somas.entries()]
    .map(([id, total]) => {
      if (id === "(sem-categoria)") {
        return { categoryId: null, nome: "Sem categoria", icone: "📦", total };
      }
      const c = nomes.get(id);
      return { categoryId: id, nome: c?.name ?? "—", icone: c?.icon ?? "📦", total };
    })
    .filter((l) => l.total > 0)
    .sort((a, b) => b.total - a.total);

  if (linhas.length <= limite) return linhas;

  const principais = linhas.slice(0, limite);
  const resto = linhas.slice(limite).reduce((acc, l) => acc + l.total, 0);
  return [...principais, { categoryId: null, nome: "Outras", icone: "•••", total: resto }];
}
