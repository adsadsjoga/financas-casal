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
`schema.sql`, não o segredo da chave. A `service_role` **não** é usada aqui.

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

## Estrutura

```
supabase/schema.sql      tabelas, RLS, views, RPCs de onboarding
src/lib/money.ts         centavos, formatação BRL, divisão sem perda
src/lib/dates.ts         datas YYYY-MM-DD sem armadilha de fuso
src/lib/auth.ts          requireSession() — usuário + casal + parceiro
src/lib/supabase/        clients de browser, server e proxy
src/app/(app)/           telas autenticadas (shell com nav)
src/app/login/           entrar e criar conta
src/app/onboarding/      criar casal ou entrar por código
```
