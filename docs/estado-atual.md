# Estado atual

> Atualizado em **2026-08-06**.
> Quem terminar uma tarefa atualiza este arquivo antes de encerrar a sessão.

## Resumo em uma linha

App no ar e em uso real pelos dois. As 11 peças do plano original estão
prontas. O módulo de carros tem banco, primeira tela e um seed pronto com o
histórico real dos 6 carros — **falta o Gabriel rodar o SQL** para os dados
entrarem de fato.

---

## Pronto e em uso

| Área | Situação |
|---|---|
| Login, cadastro, convite do casal | Funciona; os dois já estão dentro |
| Contas (individual, conjunta, privada) | Conta privada some de verdade para o parceiro |
| Multi-moeda EUR + BRL | Conversão congelada na data do lançamento |
| Transações, parcelamento, divisão | Divisão meio a meio ou por renda |
| Importar extrato OFX/CSV | Testado com arquivo real; dedup em 3 camadas |
| Fatura de cartão | Ciclo, parcelas futuras, pagar como transferência |
| Dashboard com gráficos | Entradas × saídas (6 meses) e despesas por categoria |
| Acerto de contas | Quem deve quanto, com botão de quitar |
| Orçamentos e metas | Limite por categoria; metas com aporte de cada um |
| Contas fixas | Recorrentes + previsão de saldo até o fim do mês |
| Resumo mensal por e-mail | Código pronto; **falta configurar as 3 chaves** (ver DEPLOY.md §5) |
| PWA + tema escuro | Instalável no celular; ícone próprio |
| Revisão de categoria (`/revisar`) | Fila de transações com categoria genérica; banner na home avisa quantas há |
| Home individual × casal | Botão no topo alterna Casal / Gabriel / Joana |
| Custos do mês navegável | Donut de categorias, Gabriel × Joana, maiores despesas — com seta pra voltar meses |
| Pessoas (`/pessoas`) | Quanto foi/veio de cada contraparte; 122 pessoas populadas do Excel |
| Projetos (`/projetos`) | Custo de viagem/obra somando categorias diferentes |
| Conta Nubank (BRL) | 435 lançamentos importados, saldo calibrado com o real |
| Investimentos (`/investimentos`) | Aporte líquido por ativo. Ações/FII/ETF ganham **valor de mercado real** quando você informa a quantidade que tem hoje — preço ao vivo via brapi.dev (API pública, sem token). RDB e Tesouro Direto continuam só no aporte (RDB não tem preço público; "Tesouro RendA+ 2065" não bate com vencimento oficial nenhum) — **falta rodar `06_migration_investment_holdings.sql`** pra tabela existir |

### Contas já importadas (este doc não registrava isto até 2026-08-06)

Além do Revolut, **AIB e Wise já estão no banco desde 2026-08-02** — conferido
em `Documents\Contas casal\HANDOFF_CLAUDE_CONCILIACAO.md`. Como este arquivo só
falava de Revolut, dava a impressão de que faltava importar:

| Conta | Transações | Conferência |
|---|---:|---|
| AIB | 228 | créditos = débitos, saldo 0,00 |
| Wise EUR | 434 | créditos = débitos, saldo 0,00 |
| Wise BRL | 136 | zerado em BRL e em EUR primário |

**Cuidado ao mexer em transferência:** essas importações em massa gravaram as
transferências como pares `receita`/`despesa` separados, na categoria
"Transferências internas" — **não** como `type = 'transferencia'` com
`transfer_account_id`. Foi decisão consciente (converter errado duplicaria ou
sumiria com saldo). É por isso que a tela de Pessoas casa contraparte por
descrição, e não por `transfer_account_id`: filtrar por
`type = 'transferencia'` devolveria quase nada no histórico real.

---

## Em andamento

### Módulo de carros
Banco criado e aplicado (`supabase/migrations/20260802_carros.sql`), primeira
tela publicada. Histórico real conciliado com o extrato Revolut — datas de
venda confirmadas matematicamente batendo o lucro por mês (ver
[`carros.md`](carros.md)).

Seed com conciliação (`supabase/seeds/carros-historico-e-conciliacao.sql`)
já rodado — os 6 carros e os vínculos com `transactions` reais estão no
banco. O Gabriel disse que resolve o resto (parcela pendente, taxas de
troca de nome An Post) direto no app.

**Falta depois disso:**
- [ ] Criar/editar venda com comprador e parcelas pela interface
- [ ] Dar baixa em parcela recebida
- [ ] Sugerir vínculo automático entre saque/depósito Revolut e carro
- [ ] Decidir se "Carros" sai do menu "Mais" para a barra principal

### Design
O Gabriel está mexendo no visual com o Codex. Área dele:
`src/components/ui/`, `globals.css`, layout das telas.

**Redesign a partir de mockups no Figma (Claude Code, nesta sessão):**
protótipo de 7 telas feito num arquivo Figma separado
(`Finanças do Casal — Redesign`, `n1dtMlhpgeS4lqagxTVdYL`) só como
referência de conceito — não é 1:1 com o código, porque Metas e Contas
reais já eram mais completas que o mockup (menu de ações, badges extras).
Implementado no código real, tela por tela, comparando com o mockup em
vez de substituir arquivo inteiro:
- `src/app/layout.tsx` — fonte Inter via `next/font/google`, ligada em
  `--font-geist-sans` (essa variável nunca tinha sido definida; a fonte
  real era o fallback do navegador, não Geist).
- `src/lib/nav.ts` / `src/components/app/app-nav.tsx` — barra inferior
  do celular reordenada (Início · Transações · Contas · Orçamentos ·
  Mais — Importar saiu do lugar fixo, vira ação esporádica) e o menu
  "Mais" agrupado por setor (Movimentação, Planejamento, Casal,
  Patrimônio, Conta) em vez de lista única de 10 itens.
- `src/app/(app)/orcamentos/orcamentos-client.tsx` — chip de status
  sempre visível (Em dia/Perto do limite/Estourou), não só quando
  estourando.
- `src/app/(app)/contas/contas-client.tsx` — badge "privada" virou
  `variant="secondary"` (mais visível).

Achado durante a investigação e **já corrigido**: `R$` hardcoded fora de
`formatMoney` em `investimentos-client.tsx:171` — agora usa
`formatMoney(Math.round(precoAtualBRL * 100), "BRL")`.

**Unificação de layout entre páginas (sessão seguinte, mesmo Claude Code):**
o Gabriel notou que "as páginas não mudaram" mesmo com o redesign acima —
causa raiz: cada página tinha sua própria largura, ritmo vertical e estilo
de cabeçalho/lista (5 larguras diferentes, 4 ritmos, 2 pesos de título).
Criados 4 componentes em `src/components/app/`: `PageShell` (largura
"conteudo"=max-w-3xl ou "painel"=max-w-5xl), `PageHeader` (título +
sobretítulo + descrição + ação, um estilo só), `ListCard`/`ListRow`/
`ListEmpty` (padrão de lista) e `CardDestaque` (o hero `bg-primary`, que
estava duplicado caractere por caractere entre a Home e Investimentos).

**Concluído (2026-08-04):** as 14 páginas do app migradas para os 4
componentes — Investimentos, Pessoas, Projetos, Fixas, Importar, Contas,
Transações, Acerto, Configurações, Fatura, Orçamentos, Metas, Revisar,
Carros (+ `carros/[id]` + `carros/novo`) e a Home.

- `loading.tsx` reescrito como esqueleto neutro (`PageShell` + `Skeleton`
  de `ui/skeleton.tsx`, que existia e não era usado) — antes era
  `max-w-6xl` (largura de nenhuma página real) com silhueta de dashboard
  aparecendo em TODAS as rotas do grupo `(app)`.
- Tokens ajustados em commit isolado: `globals.css` `--radius` 0.5rem →
  0.75rem; `card.tsx` `--card-spacing` 4→5 (20px) e `sm` 3→4, radius do
  Card `rounded-lg`→`rounded-xl` (e `CardHeader`/`CardFooter`, que já
  eram `rounded-t-xl`/`rounded-b-xl`, agora batem com o Card de verdade).
  **Área do Codex** (`globals.css`, `components/ui/`) — sinalizado aqui
  por ser um commit de poucas linhas, fácil de revisar/reverter se
  colidir com trabalho dele.
- Removido `src/components/app/em-construcao.tsx` (órfão, zero import).
- Regra de quando usar `Card` por item vs `ListRow`, e o cuidado de nunca
  aninhar `ListCard` dentro de outro `Card` (dobra borda/sombra),
  registrados em `docs/convencoes.md`.

Plano completo com a ordem de migração, decisões e riscos herdados:
`C:\Users\ggarc\.claude\plans\quero-q-vc-veja-gentle-narwhal.md` (fora do
repo, é um plano do Claude Code) — mantido como referência histórica.

### Exportar transações para planilha (2026-08-04)
`/transacoes` ganhou um botão "Planilha" (`exportar-transacoes-dialog.tsx`)
que baixa um CSV com filtro de conta (uma, várias ou todas) e período
(1 mês, 6 meses, 1 ano, desde o início, ou intervalo de datas escolhido).
Motivação direta: os 1292 lançamentos pendentes de revisão de categoria —
dá pra exportar tudo, revisar em planilha, e corrigir a categoria errada
com contexto de mais linhas ao mesmo tempo do que a tela `/revisar`
mostra por vez.

- Server action `exportarTransacoesCsv` em `transacoes/actions.ts` —
  monta o CSV no servidor (`;` como separador, vírgula decimal, BOM UTF-8
  no início pra abrir certo no Excel), incluindo coluna "Precisa revisar".
  **Só gera o arquivo — não tem caminho de volta.** Se no futuro quiserem
  reimportar a planilha editada para aplicar as categorias corrigidas em
  lote, isso é um recurso novo (parser + preview + confirmação, no
  padrão de `/importar`), não construído ainda.
- Nenhuma tabela nova, nenhum RLS novo — usa `requireSession()` e filtra
  por `couple_id` como todo o resto do app.

### Contas da Joana — Revolut (concluído 2026-08-03)
Reconstruído direto do CSV bruto do Revolut, não do arquivo que um GPT tinha
preparado antes (esse tinha um "ajuste" inventado de -€47 pra forçar o saldo
a bater, escondendo uma diferença real). Scripts em
`Documents\Contas casal\`, ambos já rodados e conferidos:

- `subir_revolut_joana_eur.sql` — conta corrente, 2.381 transações,
  saldo €0,08 (bate exato). A diferença de €47 era uma cobrança de academia
  ainda não processada no extrato — entrou como transação real, não ajuste.
- `subir_revolut_joana_poupanca.sql` — poupanças, 1.619 transações
  (depósitos, resgates, juros diários), €2.683,94 em Revolut Poupanca +
  €330,64 em Revolut Poupanca Australia = €3.014,58, batendo com o
  "Closing balance" que o próprio Revolut declara no CSV (1 centavo de
  arredondamento).

**Pendências reais que ficaram (não são bugs, são decisões/dados que só a
Joana/Gabriel têm):**
- [ ] 740 transações da conta corrente com categoria genérica (Outras
      despesas/receitas) — ver `_log_import_joana.txt`. Destaque: 148 linhas
      "To Joana Palminha" (ela mandando para outra conta própria fora do
      app) precisam de decisão manual, igual aos pares de pessoas do Gabriel.
- [x] ~~Split entre Poupanca/Australia deslocado~~ — **resolvido**: não era
      transferência perdida, era o bolso "Austrália 2027/2028" que se
      chamava "Brasil 2026" antes de ser renomeado no Revolut. Corrigido em
      `corrigir_brasil2026_para_australia.sql` (moveu account_id, não
      apagou nada). Confirmado: Poupanca €2.441,13 / Austrália €573,45.

### Contas do Gabriel — Revolut (concluído 2026-08-03)
Mesmo método da Joana, aplicado às duas contas dele: reconstruídas do zero a
partir do extrato bruto oficial (`account-statement_2024-05-27_2026-08-01_
en-ie_32a2ba.csv`, 5.329 linhas), substituindo o método anterior que
calibrava `initial_balance_cents` em várias sessões diferentes (scripts 27
a 35) em vez de ter o histórico real completo — isso já tinha causado uma
confusão concreta (ajuste de ~941 EUR).

`subir_revolut_gabriel_reconstrucao.sql` (já rodado): apaga as transações
antigas de `Revolut`/`Revolut Poupança`, zera `initial_balance_cents`,
reimporta 5.113 transações reais. Dois bugs achados e corrigidos durante a
construção:
- Saldo não fechava porque a coluna `Fee` do CSV não estava sendo
  descontada do valor real (`Amount - Fee`, confirmado linha a linha contra
  o `Balance` que o próprio Revolut mostra).
- Categorização quase não cruzava com a planilha de referência porque o
  cruzamento usava a data de início da transação; o certo é a data de
  conclusão (`Completed Date`) — 1 dia de diferença é comum em pagamento de
  cartão.

**Cuidado que valeu a pena**: o módulo de carros vincula pagamentos de
compradores a `transactions` via `ON DELETE CASCADE` — apagar as
transações teria apagado os 5 vínculos junto. O script recria os 43
vínculos (Danilo, Irene, Cristiane, Kelly, Pablo) por match exato de
`description`, confirmado depois de rodar.

Resultado: Revolut €328,52 (exato), Revolut Poupança €1.035,90 (€0,04
abaixo do esperado — Gabriel atribuiu a juro do intervalo entre o extrato e
hoje, aceito sem forçar ajuste).

---

## A fazer

- [x] ~~Rodar as 3 migrations novas no Supabase~~ — rodado em 2026-08-06.
      `Pessoas` e `Projetos` estão no ar; o card "de onde vem a diferença" no
      Acerto também
- [x] ~~Popular as contrapartes~~ — 122 pessoas geradas de 147 grafias do
      Excel, aplicado em 2026-08-06. Os grupos marcados `AMBIGUO` em
      `supabase/aplicar/03_seed_pessoas.sql` (17 deles) ainda valem uma
      conferida em `/pessoas` quando sobrar tempo
- [x] ~~Importar o Nubank BRL~~ — 435 lançamentos únicos importados em
      2026-08-06 (`supabase/aplicar/02_importar_nubank.sql`). Saldo inicial
      corrigido em `04_corrigir_saldo_nubank.sql` a partir do saldo real
      informado pelo Gabriel (R$ 6,68 na conta corrente + R$ 34.700,73 em
      investimentos, que não entra no saldo da conta — ver `/investimentos`)
- [ ] **Conferir a categorização dos 99 lançamentos do Nubank marcados
      `needs_review`** — caíram em "Outras despesas"/"Outras receitas" por
      falta de contraparte reconhecida (a maioria é "Crédito em conta" sem
      descrição). Fila pronta em `/revisar`
- [ ] **Rotacionar a chave `service_role` do Supabase** — foi exposta em
      conversa; item de segurança mais importante em aberto
- [ ] Ativar o resumo mensal (3 variáveis de ambiente — DEPLOY.md §5)
- [ ] Deploy automático a cada push (o repositório já está no GitHub, falta
      ligar a integração na Vercel)
- [ ] Comparação com média dos 3 meses anteriores no resumo mensal
      (deixado de fora de propósito para não inflar o escopo)
- [ ] **~1.071 transações pendentes de categoria** (331 Gabriel + 740 Joana,
      das importações de extrato bruto) — já têm fila pronta em `/revisar`,
      falta o casal ir revisando aos poucos

---

## Contexto útil

- **Saldo zerado = quase sempre erro silencioso, não dado errado.** Em
  2026-08-03 o app mostrou todas as contas zeradas por dias. Os dados sempre
  estiveram certos: a leitura de `account_balances` estourava o
  `statement_timeout` (8s) e o app caía num fallback que exibia o saldo
  inicial técnico como se fosse real. Corrigido em
  `supabase/migrations/20260803_performance_saldos.sql` (8791ms → 27ms).
  Se voltar a acontecer em qualquer conta: **olhe o log da Vercel primeiro**
  (`npx vercel logs <url>`), não o banco — a consulta rodando rápido no SQL
  Editor não prova nada, porque lá não há limite de tempo.
- **RLS com função por linha é a armadilha de performance deste schema.**
  Policies devem usar predicado de conjunto (`x in (select ...)`) e
  `(select auth.uid())`, nunca chamada de função direta por linha.
- **Trabalho não commitado é frágil.** Duas ferramentas escrevem no mesmo
  repositório; commite antes de trocar. Agora há backup remoto:
  `github.com/adsadsjoga/financas-casal` (privado), branch `main`.
- **Deploy é manual:** `npx vercel --prod`. Já aconteceu de o Gabriel testar
  em produção uma tela que só existia local e achar que estava quebrada.
  **Rode sempre de dentro de `Projetos\financas-casal`** — rodado da pasta
  pessoal, o CLI tenta publicar a home inteira e falha no meio, deixando
  `.vercel/` e `.env.local` largados lá.
- Depois de trocar o ícone, iOS e Android seguram o antigo em cache — remover
  e adicionar o app de novo na tela inicial resolve.
