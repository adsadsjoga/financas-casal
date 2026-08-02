# Finanças do Casal

App de finanças compartilhadas para duas pessoas: cada um com suas contas, planos
em conjunto, importação de extratos do banco e acerto de contas.

## Como colocar de pé

### 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project**
   (região **South America (São Paulo)**, para o app ficar rápido).
2. Guarde a senha do banco que ele pedir.
3. Depois de criado: **SQL Editor** → **New query** → cole o conteúdo de
   [`supabase/schema.sql`](supabase/schema.sql) inteiro → **Run**.
4. **Authentication → Providers → Email**: deixe *Confirm email* desligado
   enquanto vocês dois estiverem se cadastrando (liga depois, se quiser).

### 2. Conectar o app

Copie `.env.example` para `.env.local` e preencha com
**Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

A chave `anon` é pública por natureza — quem protege os dados é o RLS do
`schema.sql`, não o segredo da chave. A `service_role` só é usada pela rota
`/api/cron/resumo-mensal` (opcional — ver [DEPLOY.md](DEPLOY.md)), nunca
pelo resto do app.

### 3. Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000, crie sua conta, crie o espaço do casal e envie o
código de convite (Configurações) para sua esposa.

## Convenções do projeto

- **Dinheiro é sempre `bigint` em centavos.** Nada de `float`/`numeric`.
  Formatação e leitura só através de [`src/lib/money.ts`](src/lib/money.ts).
  `splitCents()` divide sem perder centavo.
- **`amount_cents` é sempre positivo**; a direção vem de `type`
  (`receita` / `despesa` / `transferencia`).
- **Datas são strings `YYYY-MM-DD`** (helpers em [`src/lib/dates.ts`](src/lib/dates.ts)),
  para não cair no bug clássico de fuso que muda o dia.
- **Saldo nunca é materializado** — sai da view `account_balances`.
- **Pagar fatura de cartão é uma transferência**, não uma despesa; senão o gasto
  seria contado duas vezes.
- **Toda leitura passa por RLS.** Se uma tabela nova não tiver política, ela
  simplesmente não retorna nada — isso é proposital.
- **Conta fixa não lança sozinha.** O usuário confirma no botão "Lançar" —
  a transação criada carrega `recurrence_id` apontando pra origem, e é essa
  referência (não uma heurística de "parece a mesma descrição") que decide
  se já foi paga este mês.
- **`service_role` só existe em `lib/supabase/admin.ts`**, usada só pela rota
  do cron — ignora todo o RLS de propósito, por isso nunca deve vazar pra
  código que roda no navegador.

## Estrutura

```
supabase/schema.sql            tabelas, RLS, views, RPCs de onboarding
vercel.json                    agendamento do cron do resumo mensal
src/lib/money.ts                centavos, formatação multi-moeda, divisão sem perda
src/lib/dates.ts                datas YYYY-MM-DD sem armadilha de fuso
src/lib/auth.ts                 requireSession() — usuário + casal + parceiro
src/lib/fx.ts                   cotação (Frankfurter/BCE) com cache no banco
src/lib/budgets.ts, goals.ts,
  fixas.ts, dashboard.ts        cálculo puro e testável de cada feature
src/lib/resumo-mensal.ts        monta e escapa o HTML do e-mail mensal
src/lib/supabase/               clients de browser, server, proxy e admin (service_role)
src/lib/import/                 parsers OFX/CSV, normalização, fingerprint de dedup
src/app/(app)/                  telas autenticadas (shell com nav)
src/app/(app)/fatura/[id]/      fatura de um cartão específico
src/app/login/, onboarding/     entrar, criar conta, criar/entrar no casal
src/app/api/cron/resumo-mensal/ dispara o e-mail do mês anterior (protegida por CRON_SECRET)
```

Cada feature tem um `*.test.ts` ao lado da lógica pura (`npm test`) — a
matemática (dinheiro, datas, divisão, previsão) é testada isolada do banco;
o Supabase de verdade é o que confere se a query está certa.
