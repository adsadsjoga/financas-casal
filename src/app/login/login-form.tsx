"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

/** Mensagens do Supabase vêm em inglês; aqui viram algo legível. */
function traduzErro(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("user already registered")) return "Esse e-mail já tem conta. Faça login.";
  if (m.includes("password should be at least"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Espere um pouco e tente de novo.";
  if (m.includes("fetch") || m.includes("network"))
    return "Não consegui falar com o servidor. Confira sua conexão.";
  return message;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  // Conta criada mas sem sessão: o projeto exige confirmar o e-mail. Precisa
  // ficar na tela — um toast some e o usuário fica sem entender por que
  // continua no login.
  const [aguardandoEmail, setAguardandoEmail] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setCarregando(false);

    if (error) {
      toast.error(traduzErro(error.message));
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setCarregando(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { data: { display_name: nome.trim() || email.split("@")[0] } },
    });
    setCarregando(false);

    if (error) {
      toast.error(traduzErro(error.message));
      return;
    }
    if (!data.session) {
      setAguardandoEmail(email.trim());
      return;
    }
    router.replace("/onboarding");
    router.refresh();
  }

  async function reenviarConfirmacao() {
    if (!aguardandoEmail) return;
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: aguardandoEmail,
    });
    setCarregando(false);
    if (error) {
      toast.error(traduzErro(error.message));
      return;
    }
    toast.success("Reenviei. Olhe também na caixa de spam.");
  }

  if (aguardandoEmail) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6 text-center">
          <MailCheck className="text-muted-foreground mx-auto size-8" />
          <div className="space-y-1">
            <p className="font-medium">Conta criada</p>
            <p className="text-muted-foreground text-sm">
              Falta confirmar o e-mail. Enviamos um link para{" "}
              <span className="text-foreground font-medium">{aguardandoEmail}</span>.
              Clique nele e volte aqui para entrar.
            </p>
          </div>
          <p className="text-muted-foreground text-xs">
            Não chegou? Veja o spam — ou desligue a confirmação de e-mail no
            Supabase, em Authentication → Providers → Email.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={reenviarConfirmacao}
              disabled={carregando}
            >
              {carregando ? "Reenviando…" : "Reenviar e-mail"}
            </Button>
            <Button variant="ghost" onClick={() => setAguardandoEmail(null)}>
              Voltar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue="entrar">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entrar">Entrar</TabsTrigger>
            <TabsTrigger value="criar">Criar conta</TabsTrigger>
          </TabsList>

          <TabsContent value="entrar">
            <form onSubmit={entrar} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={carregando}>
                {carregando ? "Entrando…" : "Entrar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="criar">
            <form onSubmit={cadastrar} className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Seu nome</Label>
                <Input
                  id="nome"
                  autoComplete="name"
                  placeholder="Como você aparece para sua esposa"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-novo">E-mail</Label>
                <Input
                  id="email-novo"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha-nova">Senha</Label>
                <Input
                  id="senha-nova"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">Mínimo de 6 caracteres.</p>
              </div>
              <Button type="submit" className="w-full" disabled={carregando}>
                {carregando ? "Criando…" : "Criar conta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
