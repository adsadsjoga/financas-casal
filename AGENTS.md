<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Finanças do Casal — leia isto antes de mexer

App de finanças compartilhadas do Gabriel e da Joana. Produção:
https://financas-casal-one-iota.vercel.app

**Comece por [`docs/README.md`](docs/README.md)** — é o índice de tudo.
O que está pronto, o que falta e o porquê de cada escolha está lá, não aqui.

## As 6 regras que não se quebram

Cada uma existe porque quebrá-la já causou (ou causaria) bug real:

1. **Dinheiro é sempre `bigint` em centavos.** Nunca `float`, nunca `numeric`.
   Formatar e ler só via `src/lib/money.ts`.
2. **Nunca escrever `R$` ou `€` fixo no código.** A moeda vem da conta ou do
   casal — use `formatMoney(cents, moeda)`. O app é multi-moeda (EUR + BRL).
3. **Escreva arquivos em UTF-8 de verdade.** Já aconteceu de acento virar `?`
   literal em 49 lugares (`"Finan?as do Casal"` como título de página). Se a
   ferramenta não garantir UTF-8, escreva sem acento em vez de deixar `?`.
4. **Toda tabela nova precisa de RLS.** Sem política = ninguém lê, e isso é
   proposital. Copie o padrão `public.is_couple_member(couple_id)`.
5. **Service worker não cacheia página nem resposta do Supabase.** Só ícone e
   bundle com hash. Cache ali = saldo velho na tela e dado financeiro parado
   no aparelho.
6. **Pagar fatura de cartão é `transferencia`, não `despesa`.** Senão o gasto
   conta duas vezes. Mesma lógica para saque virando "Dinheiro em mãos".

## Antes de dizer que terminou

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

`npx tsc --noEmit` pega erro que o `next build` deixa passar (já aconteceu com
arquivo de teste). Rode os dois.

## Contexto de quem usa

Mobile primeiro — o Gabriel usa quase tudo pelo celular. Tela lenta ou
apertada no telefone conta como bug, não como detalhe.

Interface e comentários de código em **português**.
