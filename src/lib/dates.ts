/** Datas no app são strings YYYY-MM-DD (date do Postgres), sem fuso. */

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Hoje em YYYY-MM-DD no horário local (não em UTC — evita o bug do dia -1). */
export function hojeISO(): string {
  const d = new Date();
  return toISODate(d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "2026-08-14" -> "2026-08-01" */
export function primeiroDiaDoMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** "2026-08" -> "2026-09-01" (início do mês seguinte, exclusivo) */
export function inicioDoMesSeguinte(iso: string): string {
  const [y, m] = iso.slice(0, 7).split("-").map(Number);
  const ano = m === 12 ? y + 1 : y;
  const mes = m === 12 ? 1 : m + 1;
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

/** Desloca um mês de referência. addMeses("2026-08-01", -6) -> "2026-02-01" */
export function addMeses(iso: string, delta: number): string {
  const [y, m] = iso.slice(0, 7).split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ano = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

/**
 * Soma meses preservando o dia, travando no último dia quando o mês é curto.
 * Sem isso, a 2ª parcela de uma compra do dia 31 de janeiro viraria
 * "2026-02-31" — data que não existe e que o Postgres recusa.
 *
 * addMesesMantendoDia("2026-01-31", 1) -> "2026-02-28"
 */
export function addMesesMantendoDia(iso: string, delta: number): string {
  const dia = Number(iso.slice(8, 10));
  const alvo = addMeses(iso, delta);
  const ultimo = diasNoMes(alvo);
  return `${alvo.slice(0, 8)}${String(Math.min(dia, ultimo)).padStart(2, "0")}`;
}

/** "2026-08-01" -> "agosto de 2026" */
export function nomeDoMes(iso: string): string {
  const [y, m] = iso.slice(0, 7).split("-").map(Number);
  return `${MESES[m - 1]} de ${y}`;
}

/** "2026-08-01" -> "ago/26" — para eixo de gráfico */
export function mesCurto(iso: string): string {
  const [y, m] = iso.slice(0, 7).split("-").map(Number);
  return `${MESES[m - 1].slice(0, 3)}/${String(y).slice(2)}`;
}

/** "2026-08-14" -> "14/08" */
export function diaMes(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** "2026-08-14" -> "14/08/2026" */
export function dataBR(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** Último dia do mês de referência, como número. */
export function diasNoMes(iso: string): number {
  const [y, m] = iso.slice(0, 7).split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** "2026-08-14" -> "2026-01-01" */
export function primeiroDiaDoAno(iso: string): string {
  return `${iso.slice(0, 4)}-01-01`;
}

/** "2026-08-14" -> "2027-01-01" (início do ano seguinte, exclusivo) */
export function inicioDoAnoSeguinte(iso: string): string {
  return `${Number(iso.slice(0, 4)) + 1}-01-01`;
}

/** Desloca uma data em dias corridos. addDias("2026-08-31", 1) -> "2026-09-01" */
export function addDias(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + delta));
}

/** "2026-08-14" -> "2026-08-15" — fim exclusivo de um dia só. */
export function diaSeguinte(iso: string): string {
  return addDias(iso, 1);
}
