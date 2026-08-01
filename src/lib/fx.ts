import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Cotações vêm do Frankfurter (dados oficiais do BCE, grátis e sem chave).
 * O BCE só publica em dia útil, então a API devolve o último dia útil
 * anterior — o que é exatamente o que se quer para lançar num sábado.
 *
 * O resultado fica em cache na tabela `exchange_rates`: cada par/dia é
 * buscado uma vez só na vida.
 */
const FRANKFURTER = "https://api.frankfurter.dev/v1";

export interface Cotacao {
  rate: number;
  day: string;
  fonte: "cache" | "api" | "fallback";
}

/** 1 unidade de `base` vale quantas de `quote`, na data pedida. */
export async function obterCotacao(
  base: string,
  quote: string,
  day: string,
): Promise<Cotacao> {
  if (base === quote) return { rate: 1, day, fonte: "cache" };

  const supabase = await createClient();

  // 1. Cache: a cotação daquele dia, ou a mais recente antes dele.
  const { data: cache } = await supabase
    .from("exchange_rates")
    .select("rate, day")
    .eq("base", base)
    .eq("quote", quote)
    .lte("day", day)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cache && cache.day === day) {
    return { rate: Number(cache.rate), day: cache.day, fonte: "cache" };
  }

  // 2. API.
  try {
    const url = `${FRANKFURTER}/${day}?base=${base}&symbols=${quote}`;
    const res = await fetch(url, {
      // Cotação de um dia passado nunca muda; a de hoje pode mudar até o
      // fechamento do BCE, e um dia de cache é tolerância suficiente.
      next: { revalidate: 60 * 60 * 24 },
    });

    if (res.ok) {
      const json = (await res.json()) as {
        date: string;
        rates: Record<string, number>;
      };
      const rate = json.rates?.[quote];
      if (typeof rate === "number" && rate > 0) {
        await supabase
          .from("exchange_rates")
          .upsert({ base, quote, day: json.date, rate })
          .select();
        return { rate, day: json.date, fonte: "api" };
      }
    }
  } catch {
    // Rede fora do ar não pode impedir alguém de lançar uma despesa.
  }

  // 3. Última cotação conhecida, mesmo que antiga. Melhor que travar.
  if (cache) {
    return { rate: Number(cache.rate), day: cache.day, fonte: "cache" };
  }

  return { rate: 1, day, fonte: "fallback" };
}

/** Preenche o cache com a série histórica de um par, de uma vez só. */
export async function preencherHistorico(
  base: string,
  quote: string,
  de: string,
  ate: string,
): Promise<number> {
  if (base === quote) return 0;

  const res = await fetch(`${FRANKFURTER}/${de}..${ate}?base=${base}&symbols=${quote}`);
  if (!res.ok) return 0;

  const json = (await res.json()) as { rates: Record<string, Record<string, number>> };
  const linhas = Object.entries(json.rates ?? {})
    .map(([day, r]) => ({ base, quote, day, rate: r[quote] }))
    .filter((l) => typeof l.rate === "number" && l.rate > 0);

  if (linhas.length === 0) return 0;

  const supabase = await createClient();
  const { error } = await supabase.from("exchange_rates").upsert(linhas);
  return error ? 0 : linhas.length;
}
