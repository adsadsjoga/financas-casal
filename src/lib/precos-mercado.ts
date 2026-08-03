import "server-only";

/**
 * Preço de fechamento de ações/FII/ETF da B3, via brapi.dev — API pública,
 * sem token, testada manualmente com os 10 tickers reais do extrato do
 * Nubank antes de integrar.
 *
 * Só existe o endpoint de LISTA COMPLETA sem token (uns 2000 papéis,
 * ~470KB) — o endpoint por ticker (`/quote/CASH3`) e o histórico exigem
 * cadastro. Por isso busca tudo de uma vez e filtra aqui, com cache de 15
 * minutos (pregão muda o dia inteiro, não faz sentido cachear um dia
 * inteiro como a cotação de câmbio em `fx.ts`).
 */
const BRAPI_LISTA = "https://brapi.dev/api/quote/list";

export interface PrecoAtivo {
  ticker: string;
  preco: number;
  fonte: "brapi" | "indisponivel";
}

/** Preço de fechamento mais recente pros tickers pedidos. Sem token = sem custo, mas também sem SLA — falha não pode quebrar a tela. */
export async function buscarPrecosB3(tickers: string[]): Promise<Map<string, PrecoAtivo>> {
  const resultado = new Map<string, PrecoAtivo>();
  if (tickers.length === 0) return resultado;

  try {
    const res = await fetch(BRAPI_LISTA, { next: { revalidate: 900 } });
    if (!res.ok) return resultado;

    const json = (await res.json()) as { stocks?: Array<{ stock: string; close: number | null }> };
    const porTicker = new Map((json.stocks ?? []).map((s) => [s.stock, s.close]));

    for (const ticker of tickers) {
      const close = porTicker.get(ticker);
      if (typeof close === "number" && close > 0) {
        resultado.set(ticker, { ticker, preco: close, fonte: "brapi" });
      }
    }
  } catch {
    // Rede fora do ar não pode derrubar a tela — só mostra sem valor de
    // mercado pros ativos que dependiam do preço.
  }

  return resultado;
}
