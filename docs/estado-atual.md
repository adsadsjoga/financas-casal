# Estado atual

> Atualizado em **2026-08-04**.
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
