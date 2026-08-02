"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOEDAS, ehMoedaConhecida, formatMoney } from "@/lib/money";
import type { FatiaCategoria, FluxoMensal } from "@/lib/dashboard";

const compacto = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * Sempre compacto, diferente de formatCompactMoney (que só compacta acima de
 * 100 mil — bom para um cartão de resumo, largo demais para o eixo de um
 * gráfico). Um valor tipo "€ 4.000,00" não cabe nos ~56px reservados para o
 * eixo Y e estouraria a borda do SVG.
 */
function formatEixo(cents: number, moeda: string): string {
  const simbolo = ehMoedaConhecida(moeda) ? MOEDAS[moeda].simbolo : moeda;
  return `${simbolo}${compacto.format(cents / 100)}`;
}

/**
 * Cores validadas pela skill de dataviz (script validate_palette.js): verde/
 * vermelho para entrada/saída falhava separação CVD para deuteranopia
 * (ΔE 5,8, abaixo do piso 6) — é justo o par que daltonismo vermelho-verde
 * confunde. Azul/vermelho lê como opostos sem cair nessa armadilha e passa
 * em todos os checks, claro e escuro. Definidas em globals.css como
 * --chart-1 / --chart-2 para trocar num lugar só.
 */
const COR_ENTRADA = "var(--chart-1)";
const COR_SAIDA = "var(--chart-2)";

function TooltipFluxo({
  active,
  payload,
  label,
  moeda,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number }>;
  label?: string;
  moeda: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium capitalize">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: p.dataKey === "entradas" ? COR_ENTRADA : COR_SAIDA }}
          />
          <span className="text-muted-foreground">
            {p.dataKey === "entradas" ? "Entradas" : "Saídas"}
          </span>
          <span className="ml-auto font-medium tabular-nums">
            {formatMoney(p.value, moeda)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function GraficoFluxoMensal({
  dados,
  moeda,
}: {
  dados: FluxoMensal[];
  moeda: string;
}) {
  const semDados = dados.every((d) => d.entradas === 0 && d.saidas === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Entradas × saídas</CardTitle>
        <div className="flex items-center gap-4 pt-1 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: COR_ENTRADA }}
            />
            <span className="text-muted-foreground">Entradas</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: COR_SAIDA }} />
            <span className="text-muted-foreground">Saídas</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {semDados ? (
          <p className="text-muted-foreground py-16 text-center text-sm">
            Sem lançamentos nesse período ainda.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dados} barCategoryGap="24%" barGap={2}>
              <CartesianGrid
                vertical={false}
                stroke="var(--chart-grid)"
                strokeDasharray="0"
              />
              <XAxis
                dataKey="label"
                axisLine={{ stroke: "var(--chart-grid)" }}
                tickLine={false}
                tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
                tickFormatter={(v: number) => formatEixo(v, moeda)}
                width={56}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                content={<TooltipFluxo moeda={moeda} />}
              />
              <Bar
                dataKey="entradas"
                fill={COR_ENTRADA}
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
                isAnimationActive={false}
              />
              <Bar
                dataKey="saidas"
                fill={COR_SAIDA}
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function TooltipCategoria({
  active,
  payload,
  moeda,
}: {
  active?: boolean;
  payload?: Array<{ payload: FatiaCategoria }>;
  moeda: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="font-medium">
        {item.icone} {item.nome}
      </p>
      <p className="text-muted-foreground tabular-nums">{formatMoney(item.total, moeda)}</p>
    </div>
  );
}

export function GraficoDespesasPorCategoria({
  dados,
  moeda,
}: {
  dados: FatiaCategoria[];
  moeda: string;
}) {
  const altura = Math.max(120, dados.length * 34);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Despesas por categoria</CardTitle>
        <p className="text-muted-foreground text-xs">Neste mês</p>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <p className="text-muted-foreground py-16 text-center text-sm">
            Nenhuma despesa neste mês ainda.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={altura}>
            <BarChart
              data={dados}
              layout="vertical"
              margin={{ left: 8, right: 24, top: 0, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--chart-muted)", fontSize: 11 }}
                tickFormatter={(v: number) => formatEixo(v, moeda)}
              />
              <YAxis
                type="category"
                dataKey="nome"
                axisLine={false}
                tickLine={false}
                width={112}
                tick={{ fill: "var(--foreground)", fontSize: 12 }}
                tickFormatter={(nome: string) => {
                  const item = dados.find((d) => d.nome === nome);
                  return item ? `${item.icone} ${nome}` : nome;
                }}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                content={<TooltipCategoria moeda={moeda} />}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}>
                {dados.map((d) => (
                  <Cell
                    key={d.nome}
                    fill={d.nome === "Outras" ? "var(--chart-muted)" : "var(--chart-1)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
