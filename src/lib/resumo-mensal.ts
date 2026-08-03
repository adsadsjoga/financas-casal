import { formatMoney } from "@/lib/money";
import { nomeDoMes } from "@/lib/dates";

/**
 * Descrição de despesa é texto livre — vem de formulário ou de extrato
 * importado. Escapar antes de colar no HTML do e-mail evita que um
 * comerciante chamado `<img src=x onerror=...>` no extrato vire HTML de
 * verdade na caixa de entrada de alguém.
 */
export function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface LinhaDespesa {
  description: string;
  amount_cents: number;
}

export interface OrcamentoEstourado {
  categoria: string;
  icone: string;
  gasto: number;
  limite: number;
}

export interface MetaEmAndamento {
  nome: string;
  icone: string;
  progresso: number;
  total: number;
  alvo: number;
}

export interface DadosResumoMensal {
  coupleName: string;
  mes: string;
  moeda: string;
  entradas: number;
  saidas: number;
  maioresDespesas: LinhaDespesa[];
  orcamentosEstourados: OrcamentoEstourado[];
  metas: MetaEmAndamento[];
  appUrl: string;
}

/**
 * Monta o HTML do e-mail. Estilos inline de propósito — a maioria dos
 * clientes de e-mail ignora `<style>` no `<head>`, então a única forma
 * confiável de estilizar é atributo/style por elemento.
 */
export function renderizarEmailResumo(d: DadosResumoMensal): string {
  const saldo = d.entradas - d.saidas;
  const corSaldo = saldo >= 0 ? "#0ca30c" : "#d03b3b";
  const fmt = (c: number) => formatMoney(c, d.moeda);

  const linhaDespesa = (l: LinhaDespesa) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #e1e0d9;color:#0b0b0b;font-size:14px;">${escapeHtml(l.description) || "Sem descrição"}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e1e0d9;color:#0b0b0b;font-size:14px;text-align:right;white-space:nowrap;">${fmt(l.amount_cents)}</td>
    </tr>`;

  const linhaOrcamento = (o: OrcamentoEstourado) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #e1e0d9;color:#0b0b0b;font-size:14px;">${o.icone} ${escapeHtml(o.categoria)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e1e0d9;color:#d03b3b;font-size:14px;text-align:right;white-space:nowrap;">${fmt(o.gasto)} / ${fmt(o.limite)}</td>
    </tr>`;

  const linhaMeta = (m: MetaEmAndamento) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #e1e0d9;color:#0b0b0b;font-size:14px;">${m.icone} ${escapeHtml(m.nome)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e1e0d9;color:#52514e;font-size:14px;text-align:right;white-space:nowrap;">${m.progresso}% · ${fmt(m.total)} de ${fmt(m.alvo)}</td>
    </tr>`;

  const secao = (titulo: string, linhasHtml: string) =>
    linhasHtml
      ? `
    <tr><td style="padding:24px 0 8px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#52514e;text-transform:uppercase;letter-spacing:0.02em;">${titulo}</p>
      <table role="presentation" width="100%" style="border-collapse:collapse;">${linhasHtml}</table>
    </td></tr>`
      : "";

  return `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
  <body style="margin:0;padding:0;background-color:#f9f9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" style="border-collapse:collapse;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" style="max-width:480px;border-collapse:collapse;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:24px 24px 0;">
            <p style="margin:0;font-size:20px;">💰</p>
            <h1 style="margin:8px 0 0;font-size:18px;color:#0b0b0b;">${escapeHtml(d.coupleName)}</h1>
            <p style="margin:4px 0 0;font-size:13px;color:#898781;text-transform:capitalize;">${nomeDoMes(d.mes)}</p>
          </td></tr>

          <tr><td style="padding:20px 24px 0;">
            <table role="presentation" width="100%" style="border-collapse:collapse;">
              <tr>
                <td style="width:33%;padding:12px 0;text-align:center;border-right:1px solid #e1e0d9;">
                  <p style="margin:0;font-size:11px;color:#898781;">Entrou</p>
                  <p style="margin:2px 0 0;font-size:15px;font-weight:600;color:#0ca30c;">${fmt(d.entradas)}</p>
                </td>
                <td style="width:33%;padding:12px 0;text-align:center;border-right:1px solid #e1e0d9;">
                  <p style="margin:0;font-size:11px;color:#898781;">Saiu</p>
                  <p style="margin:2px 0 0;font-size:15px;font-weight:600;color:#d03b3b;">${fmt(d.saidas)}</p>
                </td>
                <td style="width:33%;padding:12px 0;text-align:center;">
                  <p style="margin:0;font-size:11px;color:#898781;">Sobrou</p>
                  <p style="margin:2px 0 0;font-size:15px;font-weight:600;color:${corSaldo};">${fmt(saldo)}</p>
                </td>
              </tr>
            </table>
          </td></tr>

          <tr><td style="padding:0 24px;">
            <table role="presentation" width="100%" style="border-collapse:collapse;">
              ${secao("Maiores despesas", d.maioresDespesas.map(linhaDespesa).join(""))}
              ${secao("Orçamentos estourados", d.orcamentosEstourados.map(linhaOrcamento).join(""))}
              ${secao("Metas em andamento", d.metas.map(linhaMeta).join(""))}
            </table>
          </td></tr>

          <tr><td style="padding:24px;">
            <a href="${d.appUrl}" style="display:inline-block;background:#0b0b0b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:10px 20px;border-radius:8px;">Abrir o app</a>
          </td></tr>

          <tr><td style="padding:0 24px 24px;">
            <p style="margin:0;font-size:12px;color:#898781;">Resumo automático do mês anterior. Ninguém precisa fazer nada.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
