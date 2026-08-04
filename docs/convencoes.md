# Convenções

Cada regra aqui nasceu de um bug real ou de um bug que quase aconteceu.
O motivo está junto — sem ele, a regra parece burocracia e alguém a quebra.

## Dinheiro

**Sempre `bigint` em centavos. Nunca `float`, nunca `numeric`.**
`0.1 + 0.2` não dá `0.3` em ponto flutuante, e num app de dinheiro isso vira
saldo errado que ninguém consegue explicar.

- Formatar e ler: só via `src/lib/money.ts`.
- `amount_cents` é **sempre positivo** — a direção vem de `type`
  (`receita` / `despesa` / `transferencia`).
- Dividir valor: `splitCents()`. Ele usa maior resto, então R$ 10,00 em 3 dá
  `[334, 333, 333]` — a soma bate exata, nunca sobra nem falta centavo.

## Moeda

**Nunca escrever `R$` ou `€` fixo no código.** Use
`formatMoney(cents, moeda)`, com a moeda vindo da conta ou do casal.

Já aconteceu: o campo de valor mostrava `R$` fixo mesmo numa conta em euro.
O app é multi-moeda desde que descobrimos que o extrato real é em EUR.

A conversão para a moeda principal é **congelada na data do lançamento**
(`rate_to_primary`). Recalcular com a cotação de hoje faria o gasto de março
mudar sozinho toda vez que o câmbio mexesse.

## Datas

Strings `YYYY-MM-DD`, helpers em `src/lib/dates.ts`. Nunca `new Date()` cru
para data de lançamento — fuso horário faz a compra do dia 1º aparecer no 31.

`addMesesMantendoDia()` trava no último dia do mês: a 2ª parcela de uma compra
do dia 31 de janeiro vira 28 de fevereiro, não `2026-02-31` (data que não
existe e que o Postgres recusa).

## Codificação de arquivo

**Escreva em UTF-8 de verdade.** Já aconteceu de acento virar `?` literal em
49 lugares — `"Finan?as do Casal"` como título de página.

Se a ferramenta não garantir UTF-8, escreva **sem acento** em vez de deixar
`?`. "Financas" é feio; "Finan?as" é bug.

No PowerShell 5.1, para copiar arquivo com acento use:

```powershell
Set-Clipboard -Value ([System.IO.File]::ReadAllText("caminho", [System.Text.Encoding]::UTF8))
```

`Get-Content -Raw` lê UTF-8 como ANSI e corrompe.

## Banco e segurança

- **Toda tabela nova precisa de RLS.** Sem política, ninguém lê — proposital.
  Copie o padrão `public.is_couple_member(couple_id)`.
- Função `SECURITY DEFINER` precisa de `set search_path = public`. Sem isso é
  vetor de escalada de privilégio. **Cuidado:** dentro dela, funções de
  extensão (como `gen_random_bytes` do pgcrypto, que no Supabase vive em
  `extensions`) ficam invisíveis. Use nativa do Postgres — foi assim que
  `gen_invite_code()` quebrou.
- Saldo **nunca** é materializado — sai da view `account_balances`.
- A chave `service_role` só existe em `src/lib/supabase/admin.ts`, usada só
  pela rota do cron. Ela ignora todo o RLS; nunca deve chegar ao navegador.

## Regras de negócio que parecem detalhe mas não são

- **Pagar fatura de cartão é `transferencia`**, não despesa nova. Senão o
  gasto conta duas vezes.
- **Saque para comprar carro é transferência** para a conta "Dinheiro em
  mãos", não despesa. A despesa acontece quando o dinheiro sai de lá para o
  carro. Ver [`dados-revolut.md`](dados-revolut.md).
- **Recorrente não lança sozinha.** O usuário confirma no botão "Lançar", e a
  transação criada guarda `recurrence_id` apontando para a origem. É essa
  referência — não "a descrição parece a mesma" — que decide se já foi paga.

## Front-end

- `page.tsx` é Server Component (busca dados), `*-client.tsx` é
  `"use client"` (só tela), `actions.ts` é `"use server"` (grava).
- **Arquivo `"use server"` só exporta função assíncrona.** Um helper síncrono
  exportado ali quebra o build.
- Service worker cacheia só ícone e bundle com hash. **Nunca** página nem
  resposta do Supabase — seria saldo velho na tela e dado financeiro parado
  no aparelho.
- Cor de gráfico sai de `--chart-1` / `--chart-2` no `globals.css`. São
  azul/vermelho, não verde/vermelho: o par verde/vermelho falhou o teste de
  daltonismo (deuteranopia) — é justamente o que essas pessoas não
  distinguem.
- Mobile primeiro. Tela lenta ou apertada no celular conta como bug.
- **Layout de página usa `PageShell` + `PageHeader`, sempre.** Cada página
  tinha sua própria largura máxima (5 variantes), ritmo vertical (4) e peso
  de título (2) — qualquer ajuste de design sumia no ruído. Agora é um lugar
  só, em `src/components/app/page-shell.tsx` e `page-header.tsx`.
  `largura="conteudo"` (padrão) para leitura/lista/formulário,
  `largura="painel"` para grade de cards (dashboard, carros).
- **Lista de itens usa `ListCard`/`ListRow`** (`src/components/app/
  list-card.tsx`), exceto quando o item carrega progresso, gráfico ou
  várias ações próprias — aí um `<Card size="sm">` por item continua certo
  (Metas, Orçamentos). Não crie uma terceira variante sem essa distinção.
- **Nunca aninhe `ListCard` dentro de outro `Card`.** Se a lista já está
  dentro de um `Card`/`CardHeader` (ex.: histórico de acertos, contas na
  Home), use só `ListRow` direto no `CardContent` com `divide-y` — `ListCard`
  traz seu próprio `Card`, e dois Cards um dentro do outro duplicam borda e
  sombra.
- Hero de destaque (número grande em fundo `bg-primary`) é `CardDestaque`
  (`src/components/app/card-destaque.tsx`) — estava copiado caractere por
  caractere entre a Home e Investimentos antes de virar componente.

## Antes de dizer que terminou

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

Rode os dois checadores: `npx tsc --noEmit` pega erro que o `next build`
deixa passar (aconteceu com arquivo de teste importando com extensão `.ts`).
