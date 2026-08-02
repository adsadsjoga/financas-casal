import { diasNoMes } from "@/lib/dates";

/**
 * Dia do vencimento da recorrência NESTE mês, travado no último dia quando o
 * mês é curto — mesma lógica de addMesesMantendoDia: uma recorrente dia 31
 * cai no dia 28/29 em fevereiro, nunca numa data que não existe.
 */
export function diaEfetivoDoMes(mesRef: string, dayOfMonth: number): string {
  const dia = Math.min(dayOfMonth, diasNoMes(mesRef));
  return `${mesRef.slice(0, 8)}${String(dia).padStart(2, "0")}`;
}

export interface RecorrenciaBase {
  id: string;
  type: string;
  amount_cents: number;
  day_of_month: number;
  active: boolean;
}

export interface RecorrenciaComStatus<T extends RecorrenciaBase> {
  recorrencia: T;
  /** Data em que vence neste mês. */
  vencimento: string;
  /** Já existe uma transação deste mês ligada a ela (transactions.recurrence_id)? */
  lancada: boolean;
  /** Vencimento já passou e ainda não foi lançada. */
  atrasada: boolean;
}

/**
 * Cruza as recorrentes ativas com o que já foi lançado este mês
 * (transactions.recurrence_id) — sem heurística de "parece que é a mesma
 * descrição", que erra fácil; a referência explícita nunca engana.
 */
export function cruzarComLancamentos<T extends RecorrenciaBase>(
  recorrencias: T[],
  idsJaLancados: Set<string>,
  mesRef: string,
  hoje: string,
): RecorrenciaComStatus<T>[] {
  return recorrencias
    .filter((r) => r.active)
    .map((r) => {
      const vencimento = diaEfetivoDoMes(mesRef, r.day_of_month);
      const lancada = idsJaLancados.has(r.id);
      return {
        recorrencia: r,
        vencimento,
        lancada,
        atrasada: !lancada && vencimento < hoje,
      };
    })
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

/**
 * Projeta o saldo até o fim do mês: patrimônio de hoje + o que ainda falta
 * entrar/sair das recorrentes cujo vencimento não passou e que ainda não
 * foram lançadas. O que já foi lançado (fixa ou não) já está dentro do
 * patrimônio atual — contar de novo duplicaria.
 */
export function calcularPrevisaoSaldo<T extends RecorrenciaBase>(
  patrimonioAtualCents: number,
  status: RecorrenciaComStatus<T>[],
  hoje: string,
): number {
  let projecao = patrimonioAtualCents;
  for (const s of status) {
    if (s.lancada) continue;
    if (s.vencimento < hoje) continue; // já venceu e não foi lançada: fora da previsão, não do passado
    const sinal = s.recorrencia.type === "receita" ? 1 : s.recorrencia.type === "despesa" ? -1 : 0;
    projecao += sinal * s.recorrencia.amount_cents;
  }
  return projecao;
}
