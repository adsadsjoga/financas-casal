"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "@/components/app/money-input";
import { MOEDAS, formatAmount } from "@/lib/money";
import { CORES_CONTA, TIPOS_CONTA } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Account, AccountType, Profile } from "@/lib/database.types";

import { salvarConta } from "./actions";

export interface Membro {
  profile_id: string;
  profile: Profile;
}

export function ContaSheet({
  aberto,
  onOpenChange,
  conta,
  membros,
  contasBanco,
  moedaCasal,
}: {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  conta: Account | null;
  membros: Membro[];
  /** Contas de banco, para escolher de onde a fatura do cartão é paga. */
  contasBanco: Account[];
  moedaCasal: string;
}) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();

  const [nome, setNome] = useState(conta?.name ?? "");
  const [tipo, setTipo] = useState<AccountType>(conta?.type ?? "banco");
  const [moeda, setMoeda] = useState(conta?.currency ?? moedaCasal);
  const [dono, setDono] = useState(conta?.owner_profile_id ?? "casal");
  const [saldo, setSaldo] = useState(
    conta ? formatAmount(conta.initial_balance_cents) : "",
  );
  const [cor, setCor] = useState(conta?.color ?? CORES_CONTA[0]);
  const [privada, setPrivada] = useState(conta?.is_private ?? false);
  const [fechamento, setFechamento] = useState(
    conta?.closing_day ? String(conta.closing_day) : "",
  );
  const [vencimento, setVencimento] = useState(
    conta?.due_day ? String(conta.due_day) : "",
  );
  const [limite, setLimite] = useState(
    conta?.credit_limit_cents ? formatAmount(conta.credit_limit_cents) : "",
  );
  const [contaPagamento, setContaPagamento] = useState(
    conta?.payment_account_id ?? "",
  );

  const ehCartao = tipo === "cartao";
  const podeSerPrivada = dono !== "casal";

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await salvarConta({
        id: conta?.id,
        name: nome,
        type: tipo,
        currency: moeda,
        owner: dono,
        saldoInicial: saldo,
        color: cor,
        is_private: podeSerPrivada && privada,
        closing_day: fechamento,
        due_day: vencimento,
        limite,
        payment_account_id: contaPagamento,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar.");
        return;
      }
      toast.success(conta ? "Conta atualizada." : "Conta criada.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={aberto} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{conta ? "Editar conta" : "Nova conta"}</SheetTitle>
          <SheetDescription>
            {ehCartao
              ? "Cartão precisa do dia de fechamento para as compras caírem na fatura certa."
              : "O saldo inicial é quanto tem hoje, antes de qualquer lançamento."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={salvar} className="flex flex-1 flex-col gap-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="nome-conta">Nome</Label>
            <Input
              id="nome-conta"
              required
              placeholder="Nubank, Itaú, Carteira…"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as AccountType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPOS_CONTA).map(([valor, info]) => (
                  <SelectItem key={valor} value={valor}>
                    <span className="mr-2">{info.icon}</span>
                    {info.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">{TIPOS_CONTA[tipo].hint}</p>
          </div>

          <div className="space-y-2">
            <Label>Moeda</Label>
            <Select
              value={moeda}
              onValueChange={setMoeda}
              disabled={Boolean(conta)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MOEDAS).map(([codigo, info]) => (
                  <SelectItem key={codigo} value={codigo}>
                    {info.simbolo} {info.nome} ({codigo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {conta
                ? "A moeda não muda depois que a conta tem lançamentos."
                : moeda !== moedaCasal
                  ? `Os valores entram em ${moeda} e são convertidos para ${moedaCasal} no patrimônio.`
                  : "Mesma moeda do casal — sem conversão."}
            </p>
          </div>

          <div className="space-y-2">
            <Label>De quem é</Label>
            <Select
              value={dono}
              onValueChange={(v) => {
                setDono(v);
                if (v === "casal") setPrivada(false);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casal">💑 Conjunta (dos dois)</SelectItem>
                {membros.map((m) => (
                  <SelectItem key={m.profile_id} value={m.profile_id}>
                    {m.profile.avatar_emoji} {m.profile.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <MoneyInput
            label={ehCartao ? "Fatura em aberto hoje" : "Saldo inicial"}
            value={saldo}
            onChange={setSaldo}
          />

          {ehCartao && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="fechamento">Fecha dia</Label>
                  <Input
                    id="fechamento"
                    inputMode="numeric"
                    placeholder="28"
                    value={fechamento}
                    onChange={(e) => setFechamento(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vencimento">Vence dia</Label>
                  <Input
                    id="vencimento"
                    inputMode="numeric"
                    placeholder="5"
                    value={vencimento}
                    onChange={(e) => setVencimento(e.target.value)}
                  />
                </div>
              </div>

              <MoneyInput label="Limite (opcional)" value={limite} onChange={setLimite} />

              {contasBanco.length > 0 && (
                <div className="space-y-2">
                  <Label>Fatura paga por (opcional)</Label>
                  <Select value={contaPagamento} onValueChange={setContaPagamento}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolher conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasBanco.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {CORES_CONTA.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  onClick={() => setCor(c)}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform",
                    cor === c ? "border-foreground scale-110" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {podeSerPrivada && (
            <div className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="privada">Conta privada</Label>
                <p className="text-muted-foreground text-xs">
                  Some para a outra pessoa, junto com as transações dela.
                </p>
              </div>
              <Switch id="privada" checked={privada} onCheckedChange={setPrivada} />
            </div>
          )}

          <SheetFooter className="mt-auto px-0">
            <Button type="submit" disabled={pendente}>
              {pendente ? "Salvando…" : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={pendente}
            >
              Cancelar
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
