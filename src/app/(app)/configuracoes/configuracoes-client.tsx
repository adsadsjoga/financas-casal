"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Check, Copy, Moon, Sun, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/app/money-input";
import { formatAmount } from "@/lib/money";
import type { Couple, CoupleMember, Profile } from "@/lib/database.types";

import { salvarCasal, salvarPerfil } from "./actions";

const EMOJIS = ["🙂", "😎", "👨", "👩", "🧔", "👱‍♀️", "🦊", "🐻", "🐼", "🦁", "🌻", "⭐"];

export function ConfiguracoesClient({
  casal,
  me,
  parceiro,
}: {
  casal: Couple;
  me: CoupleMember & { profile: Profile };
  parceiro: (CoupleMember & { profile: Profile }) | null;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [pendente, startTransition] = useTransition();
  const [copiado, setCopiado] = useState(false);

  const [nome, setNome] = useState(me.profile.display_name);
  const [emoji, setEmoji] = useState(me.profile.avatar_emoji);
  const [renda, setRenda] = useState(
    me.income_cents ? formatAmount(me.income_cents) : "",
  );
  const [nomeCasal, setNomeCasal] = useState(casal.name);

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(casal.invite_code);
      setCopiado(true);
      toast.success("Código copiado.");
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não consegui copiar. Selecione e copie na mão.");
    }
  }

  function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await salvarPerfil(nome, emoji, renda);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar.");
        return;
      }
      toast.success("Salvo.");
      router.refresh();
    });
  }

  function guardarCasal(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await salvarCasal(nomeCasal);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar.");
        return;
      }
      toast.success("Salvo.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>

      {!parceiro && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="size-4" />
              Convide sua esposa
            </CardTitle>
            <CardDescription>
              Ela cria a conta dela, escolhe “Tenho um código” e digita isto:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="bg-muted flex-1 rounded-md px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] select-all">
                {casal.invite_code}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={copiarCodigo}
                aria-label="Copiar código"
              >
                {copiado ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              O código vale para uma pessoa só. Depois que ela entrar, ele deixa
              de funcionar.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Você</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={guardarPerfil} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome-perfil">Nome</Label>
              <Input
                id="nome-perfil"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`rounded-md border px-2 py-1 text-lg transition-colors ${
                      emoji === e ? "border-foreground bg-muted" : "border-transparent"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <MoneyInput
              label="Sua renda mensal (opcional)"
              value={renda}
              onChange={setRenda}
            />
            <p className="text-muted-foreground -mt-2 text-xs">
              Só serve para dividir despesa proporcionalmente — quem ganha mais
              paga mais. Fica em branco se vocês dividirem tudo meio a meio.
            </p>

            <Button type="submit" disabled={pendente}>
              {pendente ? "Salvando…" : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nosso espaço</CardTitle>
          <CardDescription>
            Moeda principal: <Badge variant="secondary">{casal.primary_currency}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={guardarCasal} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome-casal">Nome</Label>
              <Input
                id="nome-casal"
                value={nomeCasal}
                onChange={(e) => setNomeCasal(e.target.value)}
                required
              />
            </div>

            {parceiro && (
              <div className="text-muted-foreground text-sm">
                Com {parceiro.profile.avatar_emoji}{" "}
                <span className="text-foreground font-medium">
                  {parceiro.profile.display_name}
                </span>
              </div>
            )}

            <Button type="submit" disabled={pendente}>
              {pendente ? "Salvando…" : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aparência</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[
            { valor: "light", label: "Claro", Icone: Sun },
            { valor: "dark", label: "Escuro", Icone: Moon },
            { valor: "system", label: "Do sistema", Icone: null },
          ].map(({ valor, label, Icone }) => (
            <Button
              key={valor}
              variant={theme === valor ? "secondary" : "outline"}
              size="sm"
              onClick={() => setTheme(valor)}
            >
              {Icone && <Icone className="size-4" />}
              {label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
