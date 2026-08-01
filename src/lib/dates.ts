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
