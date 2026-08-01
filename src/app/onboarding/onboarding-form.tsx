"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { criarCasal, entrarNoCasal } from "./actions";

export function OnboardingForm() {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");

  function criar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await criarCasal(nome.trim() || "Nosso casal");
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui criar.");
        return;
      }
      toast.success("Pronto! Agora convide sua esposa nas configurações.");
      router.replace("/");
      router.refresh();
    });
  }

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    const code = codigo.trim().toUpperCase();
    if (code.length < 4) {
      toast.error("Digite o código de convite.");
      return;
    }
    startTransition(async () => {
      const r = await entrarNoCasal(code);
      if (!r.ok) {
        toast.error(r.error ?? "Código inválido.");
        return;
      }
      toast.success("Vocês estão conectados!");
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="criar">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="criar">Criar</TabsTrigger>
            <TabsTrigger value="entrar">Tenho um código</TabsTrigger>
          </TabsList>

          <TabsContent value="criar">
            <form onSubmit={criar} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome-casal">Nome do espaço</Label>
                <Input
                  id="nome-casal"
                  placeholder="Nossa casa"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Depois você gera um código para sua esposa entrar aqui.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={pendente}>
                {pendente ? "Criando…" : "Criar nosso espaço"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="entrar">
            <form onSubmit={entrar} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código de convite</Label>
                <Input
                  id="codigo"
                  placeholder="A1B2C3D4"
                  className="font-mono tracking-widest uppercase"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                />
              </div>
              <Button type="submit" className="w-full" disabled={pendente}>
                {pendente ? "Entrando…" : "Entrar no espaço"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
