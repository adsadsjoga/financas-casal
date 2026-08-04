"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CarFront, CircleDollarSign, Plus, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { criarContaDinheiro } from "./actions";
import type {
  Vehicle,
  VehicleCost,
  VehicleInstallment,
} from "@/lib/database.types";

export function CarrosClient({
  vehicles,
  costs,
  installments,
  hasCashAccount,
  moeda,
}: {
  vehicles: Vehicle[];
  costs: VehicleCost[];
  installments: VehicleInstallment[];
  hasCashAccount: boolean;
  moeda: string;
}) {
  const estoque = vehicles.filter((v) => v.status === "estoque");
  const vendidos = vehicles.filter((v) => v.status === "vendido");

  const [mostrarVendidos, setMostrarVendidos] = useState(
    () => estoque.length === 0 && vendidos.length > 0,
  );
  const [pending, startTransition] = useTransition();

  const visiveis = mostrarVendidos ? vendidos : estoque;

  const invested = estoque.reduce(
    (s, v) =>
      s +
      v.purchase_price_cents +
      costs
        .filter((c) => c.vehicle_id === v.id)
        .reduce((a, c) => a + c.amount_cents, 0),
    0,
  );

  const projected = estoque.reduce(
    (s, v) =>
      s +
      (v.desired_sale_price_cents ?? 0) -
      v.purchase_price_cents -
      costs
        .filter((c) => c.vehicle_id === v.id)
        .reduce((a, c) => a + c.amount_cents, 0),
    0,
  );

  const realized = vendidos.reduce(
    (s, v) =>
      s +
      (v.sale_price_cents ?? 0) -
      v.purchase_price_cents -
      costs
        .filter((c) => c.vehicle_id === v.id)
        .reduce((a, c) => a + c.amount_cents, 0),
    0,
  );

  function setupCash() {
    startTransition(async () => {
      const r = await criarContaDinheiro();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        "Conta Dinheiro em mãos pronta para os saques e pagamentos em espécie.",
      );
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.14em]">
            Operação
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Carros</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Estoque, custos, recebimentos e lucro em um só lugar.
          </p>
        </div>
        <Button asChild>
          <Link href="/carros/novo">
            <Plus className="size-4" />
            Novo carro
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">Em estoque</p>
            <p className="mt-1 text-xl font-bold">{estoque.length}</p>
            <p className="text-muted-foreground text-xs">
              {formatMoney(invested, moeda)} investidos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">Lucro projetado</p>
            <p
              className={
                "mt-1 text-xl font-bold " +
                (projected < 0 ? "text-rose-600" : "text-emerald-600")
              }
            >
              {formatMoney(projected, moeda)}
            </p>
            <p className="text-muted-foreground text-xs">estoque atual</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">Lucro realizado</p>
            <p className="mt-1 text-xl font-bold text-emerald-600">
              {formatMoney(realized, moeda)}
            </p>
            <p className="text-muted-foreground text-xs">carros vendidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">A receber</p>
            <p className="mt-1 text-xl font-bold">
              {formatMoney(
                installments.reduce((s, i) => s + i.amount_cents, 0),
                moeda,
              )}
            </p>
            <p className="text-muted-foreground text-xs">parcelas pendentes</p>
          </CardContent>
        </Card>
      </div>

      {!hasCashAccount && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-amber-500/15 p-2">
                <WalletCards className="size-4 text-amber-700" />
              </span>
              <div>
                <p className="font-medium">Controle o dinheiro dos carros</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Crie “Dinheiro em mãos” para registrar saques como
                  transferência e pagamentos em espécie como custo real.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={setupCash}
              disabled={pending}
            >
              Criar conta
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={!mostrarVendidos ? "default" : "outline"}
          onClick={() => setMostrarVendidos(false)}
        >
          Estoque ({estoque.length})
        </Button>
        <Button
          size="sm"
          variant={mostrarVendidos ? "default" : "outline"}
          onClick={() => setMostrarVendidos(true)}
        >
          Vendidos ({vendidos.length})
        </Button>
      </div>

      {visiveis.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CarFront className="text-muted-foreground mx-auto size-8" />
            <p className="mt-3 font-medium">
              {mostrarVendidos
                ? "Nenhum carro vendido ainda."
                : "Seu estoque está vazio."}
            </p>
            <Button asChild className="mt-4">
              <Link href="/carros/novo">
                <Plus className="size-4" />
                Cadastrar carro
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visiveis.map((v) => {
            const custo = costs
              .filter((c) => c.vehicle_id === v.id)
              .reduce((s, c) => s + c.amount_cents, 0);
            const profit =
              (v.sale_price_cents ?? v.desired_sale_price_cents ?? 0) -
              v.purchase_price_cents -
              custo;
            return (
              <Link key={v.id} href={"/carros/" + v.id}>
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="bg-secondary flex size-10 shrink-0 items-center justify-center rounded-lg">
                          <CarFront className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {v.make} {v.model}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {v.year ?? "—"} · {v.color || "Sem cor"}
                            {v.mileage
                              ? " · " +
                                v.mileage.toLocaleString("pt-BR") +
                                " km"
                              : ""}
                          </p>
                          <Badge
                            className="mt-2"
                            variant={
                              v.status === "vendido" ? "secondary" : "outline"
                            }
                          >
                            {v.status === "vendido" ? "Vendido" : "Em estoque"}
                          </Badge>
                        </div>
                      </div>
                      <p className="shrink-0 text-right text-sm font-bold tabular-nums">
                        {formatMoney(
                          v.sale_price_cents ?? v.desired_sale_price_cents ?? 0,
                          moeda,
                        )}
                      </p>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Compra</p>
                        <p className="mt-1 font-medium tabular-nums">
                          {formatMoney(v.purchase_price_cents, moeda)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Custos</p>
                        <p className="mt-1 font-medium tabular-nums">
                          {formatMoney(custo, moeda)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Lucro</p>
                        <p
                          className={
                            "mt-1 font-medium tabular-nums " +
                            (profit < 0 ? "text-rose-600" : "text-emerald-600")
                          }
                        >
                          {formatMoney(profit, moeda)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleDollarSign className="size-4" />
            Regra de conciliação
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            Saque no Revolut vira transferência para “Dinheiro em mãos”. O
            pagamento do carro é o custo ligado ao veículo.
          </p>
          <p>
            Assim o saque não reduz o patrimônio duas vezes e cada carro mostra
            o que realmente foi investido.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
