"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContraparteCombobox } from "@/components/app/contraparte-combobox";
import { BuscaLancamentoSheet } from "./busca-lancamento-sheet";
import { dataBR, hojeISO } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { salvarCarro, vincularLancamento, type TransacaoBuscaCarro } from "./actions";
export function NovoCarroForm({
  contrapartes,
  categorias,
  contas,
  moeda,
}: {
  contrapartes: Array<{ id: string; name: string }>;
  categorias: Array<{ id: string; name: string; icon: string }>;
  contas: Array<{ id: string; name: string }>;
  moeda: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [transacaoCompra, setTransacaoCompra] = useState<TransacaoBuscaCarro | null>(null);
  const categoriasPorId = new Map(categorias.map((c) => [c.id, c]));
  const contasPorId = new Map(contas.map((c) => [c.id, c]));
  const [f, setF] = useState({
    make: "",
    model: "",
    year: "",
    color: "",
    mileage: "",
    plate: "",
    purchasePrice: "",
    purchaseDate: hojeISO(),
    desiredSalePrice: "",
    buyerName: "",
    buyerCounterpartyId: null as string | null,
    salePrice: "",
    saleDate: "",
    notes: "",
  });
  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  const setBuyerCounterpartyId = (id: string | null) =>
    setF((x) => ({ ...x, buyerCounterpartyId: id }));
  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await salvarCarro(f);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      if (transacaoCompra) {
        const v = await vincularLancamento({
          vehicleId: r.id!,
          transactionId: transacaoCompra.id,
          role: "compra",
        });
        if (!v.ok) {
          toast.error(
            "Carro cadastrado, mas não consegui vincular a compra: " + v.error,
          );
          router.push("/carros/" + r.id);
          return;
        }
      }
      toast.success("Carro cadastrado.");
      router.push("/carros/" + r.id);
    });
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Marca *</Label>
            <Input
              required
              value={f.make}
              onChange={(e) => set("make", e.target.value)}
              placeholder="Opel"
            />
          </div>
          <div className="space-y-2">
            <Label>Modelo *</Label>
            <Input
              required
              value={f.model}
              onChange={(e) => set("model", e.target.value)}
              placeholder="Corsa"
            />
          </div>
          <div className="space-y-2">
            <Label>Ano</Label>
            <Input
              inputMode="numeric"
              value={f.year}
              onChange={(e) => set("year", e.target.value)}
              placeholder="2010"
            />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <Input
              value={f.color}
              onChange={(e) => set("color", e.target.value)}
              placeholder="Prata"
            />
          </div>
          <div className="space-y-2">
            <Label>Quilometragem</Label>
            <Input
              inputMode="numeric"
              value={f.mileage}
              onChange={(e) => set("mileage", e.target.value)}
              placeholder="180000"
            />
          </div>
          <div className="space-y-2">
            <Label>Matrícula</Label>
            <Input
              value={f.plate}
              onChange={(e) => set("plate", e.target.value)}
              placeholder="12-D-3456"
            />
          </div>
          <div className="space-y-2">
            <Label>Preço de compra *</Label>
            <Input
              required
              inputMode="decimal"
              value={f.purchasePrice}
              onChange={(e) => set("purchasePrice", e.target.value)}
              placeholder="1.050,00"
            />
          </div>
          <div className="space-y-2">
            <Label>Data da compra *</Label>
            <Input
              required
              type="date"
              value={f.purchaseDate}
              onChange={(e) => set("purchaseDate", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Preço de venda desejado</Label>
            <Input
              inputMode="decimal"
              value={f.desiredSalePrice}
              onChange={(e) => set("desiredSalePrice", e.target.value)}
              placeholder="2.900,00"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Lançamento da compra</Label>
            {transacaoCompra ? (
              <div className="bg-muted/50 flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{transacaoCompra.description || "Sem descrição"}</p>
                  <p className="text-muted-foreground text-xs">
                    {dataBR(transacaoCompra.occurred_on)} ·{" "}
                    {formatMoney(transacaoCompra.amount_primary_cents, moeda)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-xs"
                  onClick={() => setTransacaoCompra(null)}
                >
                  Remover
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBuscaAberta(true)}
              >
                <Search className="size-4" />
                Buscar lançamento por texto
              </Button>
            )}
            <p className="text-muted-foreground text-xs">
              Opcional: vincule já o pagamento em Lançamentos que corresponde a
              esta compra, sem precisar entrar no carro depois.
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 p-4">
          <div>
            <p className="font-medium">Venda já realizada?</p>
            <p className="text-muted-foreground text-xs">
              Preencha os campos abaixo somente se esse carro já foi vendido.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Preço final da venda</Label>
              <Input
                inputMode="decimal"
                value={f.salePrice}
                onChange={(e) => set("salePrice", e.target.value)}
                placeholder="3.400,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Data da venda</Label>
              <Input
                type="date"
                value={f.saleDate}
                onChange={(e) => set("saleDate", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Comprador</Label>
              <ContraparteCombobox
                contrapartes={contrapartes}
                texto={f.buyerName}
                onTextoChange={(v) => set("buyerName", v)}
                onSelecionar={setBuyerCounterpartyId}
                placeholder="Nome do comprador"
              />
              <p className="text-muted-foreground text-xs">
                Escolher uma sugestão liga o carro ao histórico completo dessa
                pessoa, em qualquer conta.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <Label>Observações</Label>
          <textarea
            className="border-input bg-background mt-2 min-h-24 w-full rounded-md border px-3 py-2 text-sm outline-none"
            value={f.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Detalhes, documentos, pendências…"
          />
        </CardContent>
      </Card>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando…" : "Salvar carro"}
      </Button>

      <BuscaLancamentoSheet
        aberto={buscaAberta}
        onOpenChange={setBuscaAberta}
        vehicleId={null}
        categorias={categoriasPorId}
        contas={contasPorId}
        moeda={moeda}
        onSelecionarSemVincular={setTransacaoCompra}
      />
    </form>
  );
}
