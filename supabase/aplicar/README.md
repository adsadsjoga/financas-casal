# Aplicar no Supabase — leva de 2026-08-06

SQLs gerados nesta sessão, prontos pra colar no **SQL Editor do Supabase**
(projeto `gkwabherhubezdmpkrzf`). Rodar **nesta ordem**, um de cada vez,
conferindo o resultado antes de ir pro próximo:

## 1. `00_verificar_aib_wise.sql`

Só leitura. Confirma que AIB e Wise (importados em 2026-08-02, antes da
reconstrução do Revolut do Gabriel em 2026-08-03) continuam com os números
batendo. Se algo aqui vier diferente do esperado, **parar e investigar antes
de continuar** — os passos seguintes assumem que o histórico está saudável.

## 2. `01_migrations_pessoas_projetos.sql`

Cria as tabelas de `counterparties`/`counterparty_aliases` (Pessoas),
`projects`/`project_transactions` (Projetos) e adiciona `category_id` na view
`split_ledger` (card "de onde vem a diferença" no Acerto). Sem isso `/pessoas`
e `/projetos` abrem vazias — a página existe, o banco que falta.

Gerado a partir de `supabase/migrations/2026080{5,6,7}_*.sql` — se algo
divergir, essas migrations são a fonte da verdade, não este arquivo.

## 3. `02_importar_nubank.sql`

Importa os 23 CSVs do Nubank (`Downloads\NU_13466045_*.csv`, 435 lançamentos
únicos após dedup pelo `Identificador` — o Nubank tem 48 linhas duplicadas
entre arquivos, exportações que se sobrepõem em janela de datas).

O que faz, em ordem, dentro de uma transação:
1. Popula `exchange_rates` com a série BRL→EUR do período (Frankfurter/BCE —
   mesma fonte que o app já usa em `src/lib/fx.ts`), pra cada lançamento
   congelar a cotação certa do próprio dia.
2. Cria a conta `Nubank` (banco, BRL, dono Gabriel) se não existir.
3. Cria as categorias que o import usa, se não existirem.
4. Insere os 435 lançamentos. Compra de ativo (`BBAS3`, `CASH3`, RDB, Tesouro)
   vira categoria "Investimentos" — mesmo tratamento que o lado EUR já tem,
   sem posição/valor de mercado, só fluxo de caixa.

**99 lançamentos caem em categoria genérica** (transferência recebida sem
contraparte reconhecida, "Crédito em conta" sem descrição) e ficam marcados
`needs_review = true` — vão aparecer na fila de `/revisar` pra classificação
manual, igual já acontece com o Revolut.

Idempotente: `external_id` é o `Identificador` do próprio Nubank, único por
lançamento. Rodar de novo não duplica.

**Saldo inicial da conta fica em 0** — o extrato não traz saldo de abertura.
Ajustar depois em `/contas` quando o Gabriel confirmar o saldo real do
Nubank, do mesmo jeito que foi feito pro Revolut e pro AIB.

## 4. `03_seed_pessoas.sql`

Popula `counterparties`/`counterparty_aliases` a partir da aba `Pessoas` do
Excel — 122 pessoas geradas de 147 grafias diferentes (uniu variações como
"Joana Palminha" / "JOANA FILIPA COSTA PALMINHA").

**Conferir antes de rodar:**
- Os **17 grupos marcados `⚠ AMBIGUO`** — o agrupador achou uma grafia curta
  que servia pra mais de uma pessoa (ex: "Gabriel Garcia" apareceria tanto em
  "Gabriel Garcia de Araujo" quanto em outro Gabriel de sobrenome diferente)
  e não decidiu sozinho. Cada bloco começa com um comentário `--` mostrando
  o total movimentado e as grafias — dá pra apagar o bloco inteiro se o
  agrupamento estiver errado, ou só remover a grafia errada da lista de
  `values` antes de rodar.
- A coluna `kind` — quase tudo sai `desconhecido` de propósito (chutar
  "cliente" pra um nome qualquer criaria dado errado que ninguém ia
  conferir). Editar depois é `update counterparties set kind = '...' where
  name = '...'`.

Depende do `02` já ter rodado: a página de Pessoas mede fluxo por descrição
da transação, incluindo agora as do Nubank (ex: "Transferência recebida pelo
Pix - Gabriel Garcia de Araujo" liga com o alias de Gabriel).

---

## Como regenerar estes arquivos

Nenhum deles deve ser editado à mão — são saída de script:

```bash
# 1: copiar as 3 migrations, ver scripts/*.py pra automação
# 2:
python scripts/gerar_import_nubank.py "C:\Users\ggarc\Downloads" > supabase/aplicar/02_importar_nubank.sql
# 3:
python scripts/seed_pessoas_do_excel.py "C:\Users\ggarc\Downloads\centralizador_financeiro_gabriel_joana.xlsx" > supabase/aplicar/03_seed_pessoas.sql
```
