import { splitCents } from "@/lib/money";
import type { CoupleMember, SplitMode } from "@/lib/database.types";

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
