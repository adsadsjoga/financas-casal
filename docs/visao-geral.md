# Visão geral

## O que é

App de finanças compartilhadas para **duas pessoas** — Gabriel e Joana, que
moram na Irlanda. Cada um tem suas contas, e existem contas e planos em
conjunto.

Substituiu um protótipo feito no Lovable que guardava tudo no `localStorage`
do navegador — por isso não sincronizava entre os dois celulares, que era
justamente o objetivo.

Além das finanças da casa, o app absorve a operação de **compra e venda de
carros** do Gabriel (que antes vivia num segundo app Lovable, o Auto Tally).

## Endereços

| O quê | Onde |
|---|---|
| App no ar | https://financas-casal-one-iota.vercel.app |
| Código | `C:\Users\ggarc\Projetos\financas-casal` (git local, branch `master`) |
| Banco | Supabase, projeto `gkwabherhubezdmpkrzf` (região South America) |
| Hospedagem | Vercel, projeto `adsmanager/financas-casal` |

Deploy **não é automático** — sobe rodando `npx vercel --prod` na pasta do
projeto. Não há repositório remoto conectado ao Git.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui ·
Supabase (Postgres + Auth + RLS) · Vercel · PWA instalável no celular.

Cotação de câmbio vem do Frankfurter (dados do BCE, grátis, sem chave).

## Onde fica cada coisa

```
docs/                      esta documentação
supabase/
  schema.sql               tabelas, RLS, views, funções de onboarding
  migrations/              mudanças aplicadas depois do schema inicial
  patches/                 correções pontuais já aplicadas
scripts/gerar-icones.mjs   gera os ícones do PWA a partir de uma imagem

src/lib/                   LÓGICA PURA — testável sem banco, é onde mora a regra
  money.ts                 centavos, multi-moeda, divisão sem perder centavo
  dates.ts                 datas YYYY-MM-DD sem armadilha de fuso
  splits.ts                divisão de despesa entre o casal
  invoices.ts              ciclo de fatura de cartão
  budgets.ts  goals.ts     orçamentos e metas
  fixas.ts                 recorrentes e previsão de saldo
  dashboard.ts             agregação dos gráficos
  fx.ts                    cotação com cache no banco
  resumo-mensal.ts         monta o HTML do e-mail mensal
  auth.ts                  requireSession() — usuário + casal + parceiro
  import/                  parsers OFX e CSV, dedup, categorização
  supabase/                clients: browser, server, proxy, admin

src/app/(app)/             telas autenticadas (todas dentro do shell com nav)
  page.tsx                 dashboard
  transacoes/ contas/      núcleo do dia a dia
  importar/                subir extrato do banco
  fatura/[id]/             fatura de um cartão
  fixas/ orcamentos/ metas/
  acerto/                  quem deve quanto a quem
  carros/                  compra e venda de veículos
  configuracoes/
src/app/api/cron/          resumo mensal por e-mail (protegido por CRON_SECRET)
src/components/app/        componentes próprios do app
src/components/ui/         shadcn — evite editar à mão, são gerados
```

## O padrão que se repete

Quase toda tela segue a mesma forma. Ao criar uma nova, copie de uma pronta
(`fixas/` é um bom modelo):

- `page.tsx` — Server Component: chama `requireSession()`, busca no Supabase,
  passa dados prontos por props.
- `*-client.tsx` — `"use client"`: só interface e estado de tela.
- `actions.ts` — `"use server"`: grava no banco, valida, chama
  `revalidatePath()`. **Todo arquivo `"use server"` só pode exportar função
  assíncrona** — helper síncrono ali quebra o build.
- A regra de cálculo mora em `src/lib/<feature>.ts`, com `<feature>.test.ts`
  ao lado. Assim a matemática é testada sem precisar de banco.

## Testes

`npm test` — 77 testes, todos de lógica pura (dinheiro, datas, divisão,
fatura, previsão, escape de HTML do e-mail). Não tocam no Supabase de
propósito: o banco é validado rodando o app de verdade.
