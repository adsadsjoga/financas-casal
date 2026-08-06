import { splitCents } from "@/lib/money";
import type { CoupleMember, Settlement, SplitMode } from "@/lib/database.types";

export interface Share {
  profile_id: string;
  share_cents: number;
}

/**
 * Quanto cada pessoa deve numa despesa dividida.
 * A soma dos shares é sempre exatamente `amountCents` — `splitCents` cuida do
 * centavo que sobra.
 *
 *   equal  -> meio a meio
 *   income -> proporcional à renda declarada (quem ganha mais paga mais)
 *   custom -> valores digitados; o resto vira ajuste na última pessoa
 */
export function calcularShares(
  amountCents: number,
  mode: SplitMode,
  members: Pick<CoupleMember, "profile_id" | "income_cents">[],
  custom?: Record<string, number>,
): Share[] {
  if (mode === "none" || members.length === 0) return [];

  if (mode === "custom" && custom) {
    const shares = members.map((m) => ({
      profile_id: m.profile_id,
      share_cents: Math.max(0, Math.round(custom[m.profile_id] ?? 0)),
    }));
    // Fecha a conta: a diferença cai em quem tem o maior share, para o total
    // bater com o valor da despesa mesmo se o usuário digitar valores tortos.
    const total = shares.reduce((a, s) => a + s.share_cents, 0);
    const diff = amountCents - total;
    if (diff !== 0 && shares.length > 0) {
      const alvo = shares.reduce((maior, s) =>
        s.share_cents > maior.share_cents ? s : maior,
      );
      alvo.share_cents = Math.max(0, alvo.share_cents + diff);
    }
    return shares;
  }

  const pesos =
    mode === "income"
      ? members.map((m) => m.income_cents)
      : members.map(() => 1);

  // Ninguém declarou renda: cair para meio a meio é mais honesto que dividir
  // por zero e jogar tudo em uma pessoa só.
  const temRenda = pesos.some((p) => p > 0);
  const valores = splitCents(amountCents, temRenda ? pesos : members.map(() => 1));

  return members.map((m, i) => ({
    profile_id: m.profile_id,
    share_cents: valores[i],
  }));
}

/**
 * Saldo do acerto de contas.
 * Positivo = `perfilA` tem a receber de `perfilB`.
 */
export function calcularSaldoAcerto(
  ledger: Array<{
    payer_profile_id: string;
    debtor_profile_id: string;
    share_cents: number;
  }>,
  settlements: Array<{
    from_profile: string;
    to_profile: string;
    amount_cents: number;
  }>,
  perfilA: string,
  perfilB: string,
): number {
  let saldo = 0;

  for (const l of ledger) {
    if (l.payer_profile_id === perfilA && l.debtor_profile_id === perfilB) {
      saldo += l.share_cents;
    } else if (l.payer_profile_id === perfilB && l.debtor_profile_id === perfilA) {
      saldo -= l.share_cents;
    }
  }

  // Um pagamento de B para A quita parte do que B devia.
  for (const s of settlements) {
    if (s.from_profile === perfilB && s.to_profile === perfilA) {
      saldo -= s.amount_cents;
    } else if (s.from_profile === perfilA && s.to_profile === perfilB) {
      saldo += s.amount_cents;
    }
  }

  return saldo;
}

/**
 * Escala shares customizados (`share_cents` gravado por pessoa) pra um novo
 * total, mantendo a proporção original — usado quando um lançamento com
 * divisão customizada é dividido em duas partes (`dividirTransacao`): sem
 * isso, a divisão customizada se perderia e as duas partes virariam 50/50
 * silenciosamente (calcularShares cai pra peso igual quando `custom` não é
 * passado). O resto do arredondamento cai em quem já tinha o maior share,
 * mesmo critério de `calcularShares`.
 */
export function escalarShares(
  sharesOriginais: Record<string, number>,
  valorOriginal: number,
  novoValor: number,
): Record<string, number> {
  if (valorOriginal <= 0) return sharesOriginais;

  const escalados = Object.entries(sharesOriginais).map(
    ([id, cents]) => [id, Math.round((cents * novoValor) / valorOriginal)] as [string, number],
  );
  const total = escalados.reduce((acc, [, v]) => acc + v, 0);
  const diff = novoValor - total;

  if (diff !== 0 && escalados.length > 0) {
    let maiorIdx = 0;
    for (let i = 1; i < escalados.length; i++) {
      if (escalados[i][1] > escalados[maiorIdx][1]) maiorIdx = i;
    }
    escalados[maiorIdx] = [escalados[maiorIdx][0], escalados[maiorIdx][1] + diff];
  }

  return Object.fromEntries(escalados);
}

export interface TransacaoParaSugestao {
  id: string;
  type: string;
  description: string;
  amount_cents: number;
  occurred_on: string;
  account_id: string;
}

/**
 * Lançamentos do usuário neste mês com valor parecido com o que está sendo
 * registrado no acerto — ajuda a reconhecer "ah, esse Pix que recebi
 * semana passada já é isso" antes de duplicar o registro. Tolerância de 5%
 * do valor ou R$5 (o que for maior), pra não perder por causa de centavos
 * de taxa/arredondamento nem ficar frouxo demais em valores pequenos.
 */
export function sugerirTransacoesParecidas(
  transacoes: TransacaoParaSugestao[],
  valorCents: number,
  limite = 5,
): TransacaoParaSugestao[] {
  if (valorCents <= 0) return [];
  const tolerancia = Math.max(valorCents * 0.05, 500);

  return transacoes
    .filter((t) => Math.abs(t.amount_cents - valorCents) <= tolerancia)
    .sort(
      (a, b) =>
        Math.abs(a.amount_cents - valorCents) - Math.abs(b.amount_cents - valorCents),
    )
    .slice(0, limite);
}

/** Filtra o histórico de acertos por texto da nota e/ou intervalo de datas. */
export function filtrarSettlements(
  settlements: Settlement[],
  opts: { termo?: string; desde?: string; ate?: string },
): Settlement[] {
  const termo = opts.termo?.trim().toLowerCase() ?? "";

  return settlements.filter((s) => {
    if (termo && !s.note.toLowerCase().includes(termo)) return false;
    if (opts.desde && s.settled_on < opts.desde) return false;
    if (opts.ate && s.settled_on > opts.ate) return false;
    return true;
  });
}

export interface OrigemDivida {
  categoryId: string | null;
  nome: string;
  icone: string;
  /** Mesmo sinal de calcularSaldoAcerto: positivo = perfilA tem a receber. */
  saldo: number;
}

/**
 * Quebra o saldo do acerto por categoria, para responder "de onde vem essa
 * diferença".
 *
 * Mostra a composição do ledger BRUTO de despesas divididas — não bate
 * exatamente com o saldo já líquido de acertos feitos, porque settlement não
 * tem categoria e ratear um pagamento entre categorias seria arbitrário. Por
 * isso a tela apresenta isso como "de onde veio", não como "o que falta".
 */
export function agruparSaldoPorCategoria(
  ledger: Array<{
    category_id: string | null;
    payer_profile_id: string;
    debtor_profile_id: string;
    share_cents: number;
  }>,
  categorias: Array<{ id: string; name: string; icon: string }>,
  perfilA: string,
  perfilB: string,
): OrigemDivida[] {
  const porId = new Map(categorias.map((c) => [c.id, c]));
  const somas = new Map<string, number>();

  for (const l of ledger) {
    let delta = 0;
    if (l.payer_profile_id === perfilA && l.debtor_profile_id === perfilB) {
      delta = l.share_cents;
    } else if (l.payer_profile_id === perfilB && l.debtor_profile_id === perfilA) {
      delta = -l.share_cents;
    } else {
      continue;
    }

    const chave = l.category_id ?? "(sem-categoria)";
    somas.set(chave, (somas.get(chave) ?? 0) + delta);
  }

  return [...somas.entries()]
    .filter(([, saldo]) => saldo !== 0)
    .map(([id, saldo]) => {
      if (id === "(sem-categoria)") {
        return { categoryId: null, nome: "Sem categoria", icone: "📦", saldo };
      }
      const c = porId.get(id);
      return { categoryId: id, nome: c?.name ?? "—", icone: c?.icon ?? "📦", saldo };
    })
    .sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));
}
