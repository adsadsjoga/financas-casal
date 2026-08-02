import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";

import { createAdminClient } from "@/lib/supabase/admin";
import { calcularGasto, statusOrcamento } from "@/lib/budgets";
import { progressoMeta, totalAportado } from "@/lib/goals";
import { montarMaioresDespesas, renderizarEmailResumo } from "@/lib/resumo-mensal";
import { addMeses, primeiroDiaDoMes, hojeISO, inicioDoMesSeguinte } from "@/lib/dates";

export const runtime = "nodejs";
// Cron dispara sem cache nenhum de rota — sempre roda de novo.
export const dynamic = "force-dynamic";

/**
 * Dispara todo dia 1 (ver vercel.json) e manda pra cada casal o resumo do
 * mês que acabou de fechar. Protegida pelo header que a Vercel Cron injeta
 * sozinha quando CRON_SECRET está configurada no projeto — sem a variável,
 * qualquer um na internet poderia chamar essa URL e disparar e-mail pra
 * todo mundo.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, aviso: "SUPABASE_SERVICE_ROLE_KEY não configurada. Nada foi enviado." },
      { status: 200 },
    );
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { ok: false, aviso: "RESEND_API_KEY não configurada. Nada foi enviado." },
      { status: 200 },
    );
  }

  const supabase = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const remetente = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://financas-casal-one-iota.vercel.app";

  const hoje = hojeISO();
  const mesAnterior = addMeses(primeiroDiaDoMes(hoje), -1);
  const proximoMes = inicioDoMesSeguinte(mesAnterior);

  const { data: casais, error: erroCasais } = await supabase.from("couples").select("*");
  if (erroCasais) {
    return NextResponse.json({ ok: false, error: erroCasais.message }, { status: 500 });
  }

  const resultado: Array<{ couple: string; enviados: number; erro?: string }> = [];

  for (const casal of casais ?? []) {
    try {
      const [membrosRes, transacoesRes, budgetsRes, categoriasRes, goalsRes] = await Promise.all([
        supabase.from("couple_members").select("profile_id").eq("couple_id", casal.id),
        supabase
          .from("transactions")
          .select("type, description, category_id, amount_primary_cents, payer_profile_id")
          .eq("couple_id", casal.id)
          .eq("type", "despesa")
          .gte("occurred_on", mesAnterior)
          .lt("occurred_on", proximoMes),
        supabase.from("budgets").select("*").eq("couple_id", casal.id).eq("month", mesAnterior),
        supabase.from("categories").select("id, name, icon").eq("couple_id", casal.id),
        supabase.from("goals").select("*").eq("couple_id", casal.id).eq("archived", false).eq("completed", false),
      ]);

      const membros = membrosRes.data ?? [];
      if (membros.length === 0) {
        resultado.push({ couple: casal.name, enviados: 0, erro: "sem membros" });
        continue;
      }

      // Receita + despesa do mês anterior (a query acima já filtrou só despesa
      // para orçamento; busca as receitas à parte para os totais do topo).
      const { data: receitas } = await supabase
        .from("transactions")
        .select("amount_primary_cents")
        .eq("couple_id", casal.id)
        .eq("type", "receita")
        .gte("occurred_on", mesAnterior)
        .lt("occurred_on", proximoMes);

      const despesas = transacoesRes.data ?? [];
      const entradas = (receitas ?? []).reduce((acc, t) => acc + t.amount_primary_cents, 0);
      const saidas = despesas.reduce((acc, t) => acc + t.amount_primary_cents, 0);

      const mapaCategorias = new Map((categoriasRes.data ?? []).map((c) => [c.id, c]));

      const orcamentosEstourados = (budgetsRes.data ?? [])
        .map((b) => {
          const gasto = calcularGasto(despesas, {
            category_id: b.category_id,
            scope: b.scope,
            profile_id: b.profile_id,
          });
          return { budget: b, gasto };
        })
        .filter(({ budget, gasto }) => statusOrcamento(gasto, budget.limit_cents) === "estourou")
        .map(({ budget, gasto }) => {
          const cat = mapaCategorias.get(budget.category_id);
          return {
            categoria: cat?.name ?? "—",
            icone: cat?.icon ?? "📦",
            gasto,
            limite: budget.limit_cents,
          };
        });

      const metasAtivas = goalsRes.data ?? [];
      const idsMetas = metasAtivas.map((g) => g.id);
      const { data: aportesData } = idsMetas.length
        ? await supabase
            .from("goal_contributions")
            .select("goal_id, profile_id, amount_cents")
            .in("goal_id", idsMetas)
        : { data: [] as { goal_id: string; profile_id: string; amount_cents: number }[] };

      const metas = metasAtivas.map((g) => {
        const aportes = (aportesData ?? []).filter((a) => a.goal_id === g.id);
        return {
          nome: g.name,
          icone: g.icon,
          progresso: progressoMeta(aportes, g.target_cents),
          total: totalAportado(aportes),
          alvo: g.target_cents,
        };
      });

      const html = renderizarEmailResumo({
        coupleName: casal.name,
        mes: mesAnterior,
        moeda: casal.primary_currency,
        entradas,
        saidas,
        maioresDespesas: montarMaioresDespesas(
          despesas.map((t) => ({ description: t.description, amount_cents: t.amount_primary_cents })),
          5,
        ),
        orcamentosEstourados,
        metas,
        appUrl,
      });

      let enviados = 0;
      for (const membro of membros) {
        const { data: userData } = await supabase.auth.admin.getUserById(membro.profile_id);
        const email = userData?.user?.email;
        if (!email) continue;

        const { error: erroEnvio } = await resend.emails.send({
          from: remetente,
          to: email,
          subject: `Resumo de ${casal.name} — o mês que passou`,
          html,
        });
        if (!erroEnvio) enviados++;
      }

      resultado.push({ couple: casal.name, enviados });
    } catch (e) {
      resultado.push({
        couple: casal.name,
        enviados: 0,
        erro: e instanceof Error ? e.message : "erro desconhecido",
      });
    }
  }

  return NextResponse.json({ ok: true, mes: mesAnterior, resultado });
}
