"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListCard, ListEmpty } from "@/components/app/list-card";
import { PessoaSheet } from "@/components/app/pessoa-sheet";
import { formatMoney } from "@/lib/money";
import { dataBR } from "@/lib/dates";
import {
  ROTULO_KIND,
  transacoesDaContraparte,
  type FluxoPessoa,
  type TransacaoDetalhada,
} from "@/lib/pessoas";
import type { CounterpartyKind } from "@/lib/database.types";

const PERIODOS = [
  { valor: "3m", rotulo: "3 meses" },
  { valor: "6m", rotulo: "6 meses" },
  { valor: "12m", rotulo: "12 meses" },
  { valor: "tudo", rotulo: "Tudo" },
];

type Ordem = "movimento" | "recebido" | "enviado";

export function PessoasClient({
  fluxos,
  transacoes,
  aliases,
  categorias,
  contas,
  periodo,
  moeda,
  totalCadastradas,
}: {
  fluxos: FluxoPessoa[];
  transacoes: TransacaoDetalhada[];
  aliases: Array<{ counterparty_id: string; pattern: string }>;
  categorias: Array<{ id: string; name: string; icon: string }>;
  contas: Array<{ id: string; name: string }>;
  periodo: string;
  moeda: string;
  totalCadastradas: number;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtroKind, setFiltroKind] = useState<string>("todas");
  const [ordem, setOrdem] = useState<Ordem>("movimento");
  const [pessoaAberta, setPessoaAberta] = useState<FluxoPessoa | null>(null);

  const categoriasPorId = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias],
  );
  const contasPorId = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);
  const transacoesDaPessoaAberta = useMemo(
    () =>
      pessoaAberta
        ? transacoesDaContraparte(pessoaAberta.counterpartyId, transacoes, aliases)
        : [],
    [pessoaAberta, transacoes, aliases],
  );

  const kindsPresentes = useMemo(() => {
    const vistos = new Set<CounterpartyKind>();
    for (const f of fluxos) vistos.add(f.kind);
    return [...vistos].sort((a, b) =>
      ROTULO_KIND[a].localeCompare(ROTULO_KIND[b]),
    );
  }, [fluxos]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrada = fluxos.filter(
      (f) =>
        (!termo || f.nome.toLowerCase().includes(termo)) &&
        (filtroKind === "todas" || f.kind === filtroKind),
    );

    if (ordem === "recebido") {
      return [...filtrada].sort((a, b) => b.totalRecebido - a.totalRecebido);
    }
    if (ordem === "enviado") {
      return [...filtrada].sort((a, b) => b.totalEnviado - a.totalEnviado);
    }
    return filtrada; // já vem ordenada por movimento total do servidor
  }, [fluxos, busca, filtroKind, ordem]);

  const totais = useMemo(
    () =>
      lista.reduce(
        (acc, f) => ({
          recebido: acc.recebido + f.totalRecebido,
          enviado: acc.enviado + f.totalEnviado,
        }),
        { recebido: 0, enviado: 0 },
      ),
    [lista],
  );

  return (
    <PageShell>
      <PageHeader
        titulo="Pessoas"
        descricao="Quanto dinheiro foi e veio de cada pessoa ou estabelecimento."
      />

      {totalCadastradas === 0 ? (
        <ListEmpty
          icone={<Users className="size-6" />}
          titulo="Nenhuma pessoa cadastrada ainda"
          descricao="Esta tela agrupa os lançamentos por quem está do outro lado — juntando as várias grafias do mesmo nome que aparecem no extrato. Cadastre as contrapartes para começar."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={periodo}
              onValueChange={(v) => router.push(`/pessoas?periodo=${v}`)}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODOS.map((p) => (
                  <SelectItem key={p.valor} value={p.valor}>
                    {p.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroKind} onValueChange={setFiltroKind}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as relações</SelectItem>
                {kindsPresentes.map((k) => (
                  <SelectItem key={k} value={k}>
                    {ROTULO_KIND[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ordem} onValueChange={(v) => setOrdem(v as Ordem)}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="movimento">Maior movimento</SelectItem>
                <SelectItem value="recebido">Mais recebido</SelectItem>
                <SelectItem value="enviado">Mais enviado</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative min-w-40 flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
              <Input
                className="h-8 pl-8"
                placeholder="Buscar pessoa…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>

          <Card>
            <CardContent className="grid grid-cols-3 divide-x divide-border py-4 text-center">
              <div>
                <p className="text-muted-foreground text-xs">Recebido</p>
                <p className="mt-1 text-sm font-bold tabular-nums">
                  {formatMoney(totais.recebido, moeda)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Enviado</p>
                <p className="mt-1 text-sm font-bold tabular-nums">
                  {formatMoney(totais.enviado, moeda)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Líquido</p>
                <p className="mt-1 text-sm font-bold tabular-nums">
                  {formatMoney(totais.recebido - totais.enviado, moeda)}
                </p>
              </div>
            </CardContent>
          </Card>

          {lista.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Nenhuma pessoa com movimento nesse período.
            </p>
          ) : (
            <ListCard>
              {lista.map((f) => (
                <div
                  key={f.counterpartyId}
                  className="space-y-2 px-(--card-spacing) py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{f.nome}</p>
                      <p className="text-muted-foreground text-xs">
                        {ROTULO_KIND[f.kind]} · {f.numTransacoes} lançamento
                        {f.numTransacoes === 1 ? "" : "s"} ·{" "}
                        {dataBR(f.primeiraTransacao)} a{" "}
                        {dataBR(f.ultimaTransacao)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        f.liquido < 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {f.liquido >= 0 ? "+" : "−"}
                      {formatMoney(Math.abs(f.liquido), moeda)}
                    </span>
                  </div>

                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="flex items-center gap-1">
                      <ArrowDownLeft className="size-3.5 text-emerald-600" />
                      Recebido{" "}
                      <span className="text-foreground font-medium tabular-nums">
                        {formatMoney(f.totalRecebido, moeda)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="size-3.5 text-rose-600" />
                      Enviado{" "}
                      <span className="text-foreground font-medium tabular-nums">
                        {formatMoney(f.totalEnviado, moeda)}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setPessoaAberta(f)}
                    >
                      Ver lançamentos
                    </Button>
                  </div>
                </div>
              ))}
            </ListCard>
          )}
        </>
      )}

      <PessoaSheet
        aberto={pessoaAberta !== null}
        onOpenChange={(v) => {
          if (!v) setPessoaAberta(null);
        }}
        nome={pessoaAberta?.nome ?? ""}
        transacoes={transacoesDaPessoaAberta}
        categorias={categoriasPorId}
        contas={contasPorId}
        moeda={moeda}
        modo="somente-leitura"
      />
    </PageShell>
  );
}
