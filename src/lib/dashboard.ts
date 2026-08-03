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

/**
 * Cor de cada fatia do donut de despesas por categoria, em ordem. "Outras"
 * sempre cai em `--chart-muted` (cinza) em vez de repetir uma cor da paleta,
 * pra não parecer mais uma categoria "de verdade".
 */
export function corFatia(index: number, nome: string): string {
  if (nome === "Outras") return "var(--chart-muted)";
  return `var(--chart-cat-${(index % 7) + 1})`;
}

export interface GastoPessoa {
  /** null = sem responsável definido (ex.: importado sem payer). */
  profileId: string | null;
  nome: string;
  icone: string;
  total: number;
}

/**
 * Quanto cada pessoa do casal pagou de despesa no período (por
 * `payer_profile_id` — quem realmente pagou, não quem deve o quê: isso já é
 * o Acerto de Contas). Sempre retorna uma linha por membro, mesmo com total
 * zero — um comparativo de 2 barras onde uma pessoa "some" seria lido como
 * "sem dado", não "gastou zero".
 */
export function agregarGastosPorPessoa(
  transacoes: Array<{ type: string; payer_profile_id: string | null; amount_primary_cents: number }>,
  membros: Array<{ profile_id: string; display_name: string; avatar_emoji: string }>,
): GastoPessoa[] {
  const somas = new Map<string, number>();
  let semResponsavel = 0;

  for (const t of transacoes) {
    if (t.type !== "despesa") continue;
    if (t.payer_profile_id === null) {
      semResponsavel += t.amount_primary_cents;
    } else {
      somas.set(t.payer_profile_id, (somas.get(t.payer_profile_id) ?? 0) + t.amount_primary_cents);
    }
  }

  const linhas: GastoPessoa[] = membros.map((m) => ({
    profileId: m.profile_id,
    nome: m.display_name,
    icone: m.avatar_emoji,
    total: somas.get(m.profile_id) ?? 0,
  }));

  if (semResponsavel > 0) {
    linhas.push({ profileId: null, nome: "Sem responsável", icone: "📦", total: semResponsavel });
  }

  return linhas;
}

/** As N maiores despesas (ou qualquer item com `amount_cents`), maior primeiro. */
export function maioresDespesas<T extends { amount_cents: number }>(itens: T[], limite = 5): T[] {
  return [...itens].sort((a, b) => b.amount_cents - a.amount_cents).slice(0, limite);
}
