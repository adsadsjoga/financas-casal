import { addMeses, diasNoMes, primeiroDiaDoMes } from "@/lib/dates";

/**
 * Espelha compute_invoice_month() do banco (supabase/schema.sql): uma compra
 * feita em `data` cai na fatura do mês corrente se ainda não passou do dia
 * de fechamento, ou na do mês seguinte se já passou.
 */
export function computeInvoiceMonth(closingDay: number | null, data: string): string {
  const mes = primeiroDiaDoMes(data);
  if (!closingDay) return mes;
  const dia = Number(data.slice(8, 10));
  return dia >= closingDay ? addMeses(mes, 1) : mes;
}

/** A fatura que está acumulando hoje — ainda não fechou. */
export function faturaAbertaHoje(closingDay: number | null, hoje: string): string {
  return computeInvoiceMonth(closingDay, hoje);
}

/**
 * Estimativa de vencimento: se o dia de vencimento vem depois do dia de
 * fechamento, o vencimento cai no mesmo mês da fatura; senão, cai no mês
 * seguinte (o padrão mais comum: fecha ~dia 28, vence ~dia 5 do mês depois).
 * É uma estimativa a partir da configuração do próprio cartão — não um dado
 * vindo do banco — por isso fica só como referência na tela, não como prazo
 * oficial.
 */
export function estimativaVencimento(
  invoiceMonth: string,
  closingDay: number,
  dueDay: number,
): string {
  const mesRef = dueDay > closingDay ? invoiceMonth : addMeses(invoiceMonth, 1);
  const dia = Math.min(dueDay, diasNoMes(mesRef));
  return `${mesRef.slice(0, 8)}${String(dia).padStart(2, "0")}`;
}
