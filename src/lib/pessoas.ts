import { normalizeDescription } from "@/lib/import/normalize";
import type { CounterpartyKind } from "@/lib/database.types";

export interface FluxoPessoa {
  counterpartyId: string;
  nome: string;
  kind: CounterpartyKind;
  /** Dinheiro que entrou na conta de vocês vindo dessa pessoa. */
  totalRecebido: number;
  /** Dinheiro que saiu daqui para essa pessoa. */
  totalEnviado: number;
  /** Positivo: recebeu mais do que mandou. */
  liquido: number;
  numTransacoes: number;
  primeiraTransacao: string;
  ultimaTransacao: string;
}

export interface TransacaoComDescricao {
  type: string;
  description: string;
  amount_primary_cents: number;
  occurred_on: string;
}

/**
 * Descobre a qual contraparte um lançamento pertence, pelo texto da descrição.
 *
 * Bate por substring na descrição normalizada — a mesma pessoa aparece com
 * grafias diferentes no extrato ("To Joana Palminha", "Payment from JOANA
 * FILIPA COSTA PALMINHA"), então casar a string inteira não funcionaria.
 *
 * Quando mais de um alias casa, ganha o mais longo: "joana filipa costa
 * palminha" é uma identificação mais específica que "joana", e o mais curto
 * roubaria lançamentos do mais específico dependendo da ordem da lista.
 */
export function acharContraparte(
  descricao: string,
  aliasesPorPadrao: Array<{ counterparty_id: string; pattern: string }>,
): string | null {
  const alvo = normalizeDescription(descricao);
  if (!alvo) return null;

  let melhor: { id: string; tamanho: number } | null = null;
  for (const alias of aliasesPorPadrao) {
    if (!alias.pattern) continue;
    if (!alvo.includes(alias.pattern)) continue;
    if (!melhor || alias.pattern.length > melhor.tamanho) {
      melhor = { id: alias.counterparty_id, tamanho: alias.pattern.length };
    }
  }
  return melhor?.id ?? null;
}

/**
 * Quanto dinheiro foi e veio de cada contraparte no período.
 *
 * Transferência não entra: uma transferência entre contas do próprio casal
 * não é dinheiro indo para outra pessoa, e contá-la aqui dobraria o valor de
 * quem tem as duas pontas importadas.
 */
export function agregarFluxoPorPessoa(
  transacoes: TransacaoComDescricao[],
  contrapartes: Array<{ id: string; name: string; kind: CounterpartyKind }>,
  aliases: Array<{ counterparty_id: string; pattern: string }>,
): FluxoPessoa[] {
  const porId = new Map(contrapartes.map((c) => [c.id, c]));
  const acumulado = new Map<string, FluxoPessoa>();

  for (const t of transacoes) {
    if (t.type !== "receita" && t.type !== "despesa") continue;

    const id = acharContraparte(t.description, aliases);
    if (id === null) continue;

    const contraparte = porId.get(id);
    if (!contraparte) continue;

    let linha = acumulado.get(id);
    if (!linha) {
      linha = {
        counterpartyId: id,
        nome: contraparte.name,
        kind: contraparte.kind,
        totalRecebido: 0,
        totalEnviado: 0,
        liquido: 0,
        numTransacoes: 0,
        primeiraTransacao: t.occurred_on,
        ultimaTransacao: t.occurred_on,
      };
      acumulado.set(id, linha);
    }

    if (t.type === "receita") linha.totalRecebido += t.amount_primary_cents;
    else linha.totalEnviado += t.amount_primary_cents;

    linha.numTransacoes += 1;
    if (t.occurred_on < linha.primeiraTransacao) linha.primeiraTransacao = t.occurred_on;
    if (t.occurred_on > linha.ultimaTransacao) linha.ultimaTransacao = t.occurred_on;
  }

  for (const linha of acumulado.values()) {
    linha.liquido = linha.totalRecebido - linha.totalEnviado;
  }

  // Maior movimento primeiro: quem move mais dinheiro é o que interessa
  // olhar, independente do sentido.
  return [...acumulado.values()].sort(
    (a, b) => b.totalRecebido + b.totalEnviado - (a.totalRecebido + a.totalEnviado),
  );
}

export const ROTULO_KIND: Record<CounterpartyKind, string> = {
  pessoa: "Pessoa",
  familiar: "Familiar",
  amigo: "Amigo",
  cliente: "Cliente",
  vendedor: "Vendedor",
  senhorio: "Senhorio",
  empregador: "Empregador",
  conta_propria: "Conta própria",
  estabelecimento: "Estabelecimento",
  desconhecido: "Sem classificação",
};
