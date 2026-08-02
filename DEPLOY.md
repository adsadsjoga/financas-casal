# Colocar o app no ar

Três passos. O único que só você pode fazer é o login nas contas.

## 1. Aplicar o schema no Supabase

Abra o [SQL Editor](https://supabase.com/dashboard/project/gkwabherhubezdmpkrzf/sql/new),
cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.

Para copiar o arquivo inteiro **no PowerShell** (não no SQL Editor):

```bash
Set-Clipboard -Value ([System.IO.File]::ReadAllText("C:\Users\ggarc\Projetos\financas-casal\supabase\schema.sql", [System.Text.Encoding]::UTF8))
```

Não use `Get-Content -Raw` aqui: o PowerShell 5.1 lê arquivo UTF-8 como ANSI
e os acentos e emojis das categorias (`Salário`, `Alimentação`, `⛽`) chegam
corrompidos no banco.

Depois, em **Authentication → Providers → Email**, desligue *Confirm email*
enquanto vocês dois se cadastram. Ligue de novo quando terminarem.

Conferir se deu certo — deve listar as tabelas:

```bash
node -e "fetch('https://gkwabherhubezdmpkrzf.supabase.co/rest/v1/couples?select=id&limit=1',{headers:{apikey:process.env.K}}).then(r=>console.log(r.status===200?'schema OK':'faltou rodar o SQL ('+r.status+')'))"
```

## 2. Publicar na Vercel

```bash
npx vercel login
```

Depois, na pasta do projeto:

```bash
npx vercel --prod
```

Aceite os padrões (framework Next.js é detectado sozinho). No fim ele imprime
a URL pública.

## 3. Configurar as variáveis de ambiente

As chaves do `.env.local` **não** sobem com o deploy — precisam ser
cadastradas na Vercel:

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
```

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

Valores (os mesmos do `.env.local`):

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://gkwabherhubezdmpkrzf.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a chave `sb_publishable_...` |

Redeploy para as variáveis valerem:

```bash
npx vercel --prod
```

## 4. Instalar no celular

Abra a URL da Vercel no celular:

- **iPhone (Safari):** Compartilhar → *Adicionar à Tela de Início*
- **Android (Chrome):** menu ⋮ → *Instalar app*

## 5. Ativar o resumo mensal por e-mail (opcional)

Sem isto o app funciona normalmente — só não chega e-mail nenhum no dia 1º.
Três variáveis, todas descritas em [`.env.example`](.env.example):

1. **`SUPABASE_SERVICE_ROLE_KEY`** — Supabase → Project Settings → API Keys
   → `service_role`. Só a rota do cron usa; ela ignora todo o RLS, então
   nunca deve levar o prefixo `NEXT_PUBLIC_`.
2. **`RESEND_API_KEY`** — crie conta grátis em [resend.com](https://resend.com)
   → API Keys. `RESEND_FROM_EMAIL` pode ficar como `onboarding@resend.dev`
   pra testar sem verificar domínio.
3. **`CRON_SECRET`** — qualquer string aleatória longa. A Vercel manda esse
   mesmo valor sozinha quando o cron dispara (basta a variável existir no
   projeto); sem ela a rota fica aberta pra qualquer um na internet.

```bash
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add RESEND_API_KEY production
npx vercel env add RESEND_FROM_EMAIL production
npx vercel env add CRON_SECRET production
npx vercel --prod
```

O agendamento (dia 1 de cada mês, 8h UTC) já está em
[`vercel.json`](vercel.json) — a Vercel ativa sozinha ao ver o arquivo no
deploy, não precisa de nenhuma configuração manual no painel.

Pra testar sem esperar o dia 1, chame a rota na mão com o mesmo segredo:

```bash
curl https://financas-casal-one-iota.vercel.app/api/cron/resumo-mensal -H "Authorization: Bearer SEU_CRON_SECRET"
```

Ela sempre manda o resumo do **mês anterior** (dia 15 de agosto → resumo de
julho), pros e-mails de cadastro dos dois membros de cada casal.

## Depois

Ligar o deploy automático a cada `git push`: crie um repositório **privado**
no GitHub e conecte em **Vercel → Project → Settings → Git**. Sendo dado
financeiro de vocês, o repositório precisa ser privado.

## Notas

- A `anon key` é pública por natureza — quem protege os dados é o RLS do
  `schema.sql`. A `service_role` só é usada pela rota `/api/cron/resumo-mensal`
  (passo 5) — nenhum outro código do app toca nela.
- O service worker só cacheia ícones e bundles com hash. Página e resposta do
  Supabase nunca são guardadas: cache ali significaria saldo velho na tela e
  dado financeiro parado no aparelho.
