export interface Aporte {
  profile_id: string;
  amount_cents: number;
}

/** Soma de todos os aportes — pode passar de 100% se guardaram mais que a meta. */
export function totalAportado(aportes: Aporte[]): number {
  return aportes.reduce((acc, a) => acc + a.amount_cents, 0);
}

/** Para a barra visual: nunca passa de 100, mesmo que o total real passe. */
export function progressoMeta(aportes: Aporte[], targetCents: number): number {
  if (targetCents <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((totalAportado(aportes) / targetCents) * 100)));
}

export interface ContribuicaoPorPessoa {
  profile_id: string;
  total: number;
}

/** Quanto cada pessoa já contribuiu, maior primeiro. */
export function agruparPorContribuinte(aportes: Aporte[]): ContribuicaoPorPessoa[] {
  const somas = new Map<string, number>();
  for (const a of aportes) {
    somas.set(a.profile_id, (somas.get(a.profile_id) ?? 0) + a.amount_cents);
  }
  return [...somas.entries()]
    .map(([profile_id, total]) => ({ profile_id, total }))
    .sort((a, b) => b.total - a.total);
}

/** Dias até o prazo; negativo = já passou. Sem prazo, retorna null. */
export function diasAteOPrazo(deadline: string | null, hoje: string): number | null {
  if (!deadline) return null;
  const a = new Date(`${deadline}T00:00:00`);
  const b = new Date(`${hoje}T00:00:00`);
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}
