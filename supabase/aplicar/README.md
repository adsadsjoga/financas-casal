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

## 4. `04_corrigir_saldo_nubank.sql` e `05_limpar_nubank_duplicado.sql`

Calibração pontual do saldo real do Nubank (rodados e conferidos em
2026-08-06/07) — não precisam rodar de novo, ficam só de registro. O `05`
existe porque o `04` original filtrava só por `name = 'Nubank'` sem checar
se havia mais de uma conta com esse nome; deixou 2 contas vazias duplicadas
que o `05` limpou.

## 5. `06_migration_investment_holdings.sql`

Cria `investment_holdings` — quantidade de ação/FII/ETF que você informa à
mão em `/investimentos`, pra calcular valor de mercado (quantidade × preço
ao vivo via brapi.dev, API pública sem token). Independente das migrations
anteriores, pode rodar isolado a qualquer momento.

**Por que só quantidade manual, não tudo automático:** o extrato do Nubank
só traz o valor total gasto em cada compra, nunca quantidade nem preço por
cota — não tem como derivar isso do que já foi importado. RDB e Tesouro
Direto continuam só no aporte líquido: RDB é produto exclusivo do Nubank sem
preço público em lugar nenhum, e "Tesouro RendA+ 2065" do extrato não bate
com nenhum vencimento oficial (Tesouro Transparente só tem 2064 ou 2069).

---

# Leva de 2026-08-05 — conciliação com o centralizador do GPT

Fonte: `centralizador_financeiro_com_carros_antigos_e_pendencias.xlsx`
(23 abas, 9.149 transações). Rodar **em ordem**, conferindo cada um.

## 6. `07_diagnosticar_conciliacao_xlsx.sql`

Só leitura. Confirma no banco os 4 achados da comparação antes de qualquer
`update`: categorias duplicadas por acento, contas com nome ambíguo, os
números dos carros, e as transações-âncora dos carros antigos. **Se algo vier
diferente do documentado no próprio arquivo, parar aqui.**

## 7. `08_unificar_categorias_duplicadas.sql`

Corrige o bug mais caro achado na comparação: existiam
`Transferências internas` e `Transferencias internas` como categorias
separadas, e o filtro do dashboard (`CATEGORIAS_FORA_DO_RESULTADO`) só
conhecia a primeira — ~578 transações de giro interno entravam no resultado
como receita/despesa real.

Repontar `category_id` nas 4 tabelas que referenciam `categories` e arquiva as
perdedoras. Orçamento que colidir fica de fora e é **listado** para decisão
manual, em vez de somado ou descartado sozinho.

O lado do código já está corrigido: `estaForaDoResultado()` compara por nome
normalizado, então a duplicata não volta a furar o filtro no próximo import.

## 8. `09_carros_conciliacao_xlsx.sql`

Corrige os 6 carros para os números do Excel (que achou 404,12 EUR de custo
real que o Auto Tally não tinha), conserta `Honda ix35` → `Hyundai ix35`,
baixa a compra do Qashqai 2011 de 1.350 para 1.200 com a transação que a
comprova, e **cadastra os 8 veículos de 2025** que não existiam aqui.

Quatro deles entram como `estoque`, não `vendido`: a venda não tem data
comprovada, e inventar uma só para satisfazer a constraint seria repetir o
erro do "ajuste de €47". As pendências que dependem do Gabriel estão listadas
no fim do arquivo.

## 9. `10_pessoas_do_xlsx_2026-08-05.sql`

Regenera as contrapartes a partir da aba Pessoas nova: 207 grupos, contra os
122 de `03_seed_pessoas.sql`. O ganho não é só volume — os compradores e
vendedores de carro agora entram classificados como `cliente`/`vendedor`,
porque `seed_pessoas_do_excel.py` passou a ler o "Tipo predominante" da
planilha em vez de só adivinhar pelo nome.

Idempotente (`on conflict`), então não conflita com o `03`.

## 10. `11_projetos_do_xlsx.sql`

Cria os 3 projetos da aba "Divisões 50-50" e vincula as despesas. As
transferências entre Gabriel e Joana **não** entram — são giro interno, e
somar as duas pontas faria o projeto custar uma vez e meia o real.

## 11. `12_revincular_compras_originais_perdidas.sql`

Achado por acidente ao conferir o `09_`, não causado por ele. Existe FK
`ON DELETE CASCADE` de `vehicle_transaction_links.transaction_id` para
`transactions`. Quando `subir_revolut_gabriel_reconstrucao.sql` apagou as
transações antigas de Revolut do Gabriel para reimportar do extrato oficial
(2026-08-03), isso levou junto os 4 vínculos de **compra** feitos pelo seed
original em 02/08 (Qashqai 2010, Ford Ka, Ford Focus, Hyundai ix35— o Excel
chama de Honda). `docs/estado-atual.md` registra que a reconstrução recriou
só os 5 vínculos do lado **comprador** (Danilo, Irene, Cristiane, Kelly,
Pablo); os 4 do lado vendedor nunca voltaram.

Relinca os 4 pela mesma descrição+valor+data já documentados em
`docs/carros.md`, mais os 4 custos do Hyundai ix35 (Marius Garage ×2,
Brendan Walsh Tyres, Top Part Limited) — mesma causa, mesma data conhecida.
Os 2 custos "Sebastians Garage" (Opel Corsa 477,55 / Ford Focus 527,66) ficam
só como diagnóstico no fim do arquivo — a data exata deles não estava
registrada em nenhum documento lido nesta sessão.

## 12. `13` a `18` — fechamento dos vínculos de carro

Sequência de tentativa/erro real, documentada assim de propósito (não
reescrita como se tivesse dado certo de primeira):

- `13_diagnosticar_compras_perdidas.sql` — o `12_` rodou sem erro mas não
  criou os vínculos de compra; este script busca as transações por valor
  exato e por nome do vendedor, sem restringir data, pra descobrir se elas
  simplesmente não existem ou se o matching do `12_` tinha um bug.
- `14_vincular_compras_e_custos_confirmados.sql` — usa os `transaction_id`
  exatos achados pelo `13_` em vez de matching aproximado. Ainda deu erro de
  FK (um dos ids coletados ficou obsoleto entre a busca e o uso — ambiente
  com escrita concorrente, ver "Trabalho não commitado é frágil" em
  `docs/estado-atual.md`); reescrito pra usar `inner join` com `transactions`
  em vez de insert cego, então um id obsoleto só é ignorado, não derruba o
  resto.
- `15_vincular_custos_ix35.sql` — os 4 custos do Hyundai ix35 (Marius Garage
  ×2, Brendan Walsh Tyres, Top Part Limited), achados pelo diagnóstico do
  `14_`.
- `16_status_geral_vinculos_carros.sql`, `17_diagnosticar_gaps_restantes.sql`
  — só leitura, conferem o que ainda faltava linkar nos 14 veículos.
- `18_finalizar_vinculos_carros.sql` — os últimos 8 pares (Qashqai 2011 +
  5 carros antigos + 2 Sebastians Garage), com ids frescos do `17_`.

Resultado final conferido: os únicos veículos sem vínculo de compra são os
que realmente saíram em dinheiro (Opel Corsa 2010, Volkswagen Polo, Renault
Fluence, Ford Fiesta vermelho) — nenhum zero inesperado sobrou.

---

# Leva de 2026-08-08 — conta do comprador + projetos como registro do casal

Pedido do Gabriel depois de ver o trabalho manual de conciliação: em vez de
caçar transação por nome/valor/data toda vez, a tela devia calcular isso
sozinha. Ver o plano completo em
`C:\Users\ggarc\.claude\plans\c-users-ggarc-downloads-centralizador-f-rustling-hippo.md`.

## 13. `19_migration_conta_comprador_e_projetos.sql`

**Rodar primeiro — sem isso as páginas `/carros/[id]` e `/projetos` quebram**
(colunas novas ainda não existem no banco). Adiciona
`vehicles.buyer_counterparty_id` (liga o comprador de um carro a uma
contraparte cadastrada) e `projects.kind` + `projects.planned_amount_cents`
(orçamento planejado, "queremos fazer isso, vai custar mais ou menos X").

## 14. `20_preencher_buyer_counterparty.sql`

Casa `vehicles.buyer_name` dos 14 veículos já cadastrados com uma
`counterparty` existente (mesmo mecanismo de match que `/pessoas` usa) e
preenche `buyer_counterparty_id` só quando há exatamente 1 candidato.
Ambíguo ou sem match nenhum fica de fora — decisão manual pela tela do carro,
que agora tem um combobox de busca no lugar do texto livre.

## 15. `21_diagnosticar_viagens.sql`

Só leitura. Agrupa as transações de categoria "Viagem"/"Viagens" dos dois
titulares por proximidade de data (corte em 14 dias sem movimento), pra virar
projeto por viagem — pedido do Gabriel: `/projetos` vira o registro geral do
que o casal quer fazer ou já fez, não só o que já foi organizado manualmente.
Confirma também se o "Booking.com" de €283,94 (2026-06-10) é hospedagem do
casamento (mesma data de "Câmera do casamento", já no projeto) em vez de uma
viagem separada.

**Rodado em 2026-08-08.** Resultado: 11 clusters, 34 transações.

## 16. `22_criar_projetos_viagens.sql`

Cria 10 projetos "Viagem DD/MM/AAAA" (clusters 1 a 10, 26 lançamentos,
€1.820,83) e joga o cluster 11 dentro do projeto que já existe.

**O cluster 11 é a viagem do casamento, não uma viagem nova.** A prova saiu
do próprio diagnóstico: o Airbnb de €640,80 (11/06/2026) que aparece dentro
dele é exatamente a transação que `11_projetos_do_xlsx.sql` já tinha
vinculado ao projeto "Casamento — Søborg/Copenhaga", vinda da aba "Divisões
50-50". As outras 7 transações do cluster (2 Booking.com, 2 Airbnb,
3 Ryanair — €775,78) estavam soltas e entram nesse projeto.

Os nomes são provisórios, com a data do primeiro lançamento — só o cluster 5
tem pista de destino no extrato (Killarney Plaza Hotel). Renomear pelo app;
inventar destino sem evidência seria dado errado que ninguém conferiria
depois.

Recalcula os clusters dentro do próprio `insert` em vez de usar
`transaction_id` fixo — ids colhidos numa consulta e usados noutra ficaram
obsoletos duas vezes nesta sessão. E repete a CTE em cada statement em vez de
usar temp table/view, porque o pgbouncer do SQL Editor não garante a mesma
conexão entre statements (foi o que quebrou o `08_` na primeira tentativa).

---

## Como regenerar estes arquivos

Nenhum deles deve ser editado à mão — são saída de script:

```bash
# 1: copiar as 3 migrations, ver scripts/*.py pra automação
# 2:
python scripts/gerar_import_nubank.py "C:\Users\ggarc\Downloads" > supabase/aplicar/02_importar_nubank.sql
# 3:
python scripts/seed_pessoas_do_excel.py "C:\Users\ggarc\Downloads\centralizador_financeiro_gabriel_joana.xlsx" > supabase/aplicar/03_seed_pessoas.sql
# 10:
python scripts/seed_pessoas_do_excel.py "C:\Users\ggarc\Downloads\centralizador_financeiro_com_carros_antigos_e_pendencias.xlsx" > supabase/aplicar/10_pessoas_do_xlsx_2026-08-05.sql
```

Os `07`, `08`, `09` e `11` foram escritos à mão e podem ser editados
diretamente.
