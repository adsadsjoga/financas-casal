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

---

# Leva de 2026-08-06 — CGD da Joana + sincronização de classificações

Fonte: `Joana_Ano_Completo_12M_Todos_Meses_Confirmados.xlsx` (Downloads),
14 abas, superset estrito de `Joana_Pagamentos_Nomeados_Classificados_e_Linkados.xlsx`
(mesma aba "Joana Atualizada" com 96 linhas a mais — o arquivo antigo fica
obsoleto). A Joana tinha só Revolut cadastrado; a planilha nova traz o banco
**CGD** e categorias revisadas ("Categoria atualizada") para o Revolut já
importado.

**Escopo desta leva é só CGD.** A mesma aba "Joana Atualizada" também tem
206 linhas de Trading 212 e 72 de ActivoBank — nenhum dos dois existe no
app ainda. Ficou de fora de propósito (decisão do Gabriel, 2026-08-06) para
não inflar esta leva; ver pendência no fim desta seção.

## 23. `23_diagnosticar_joana_cgd.sql`

Só leitura. Confirma antes de qualquer mudança: que CGD ainda não existe em
`accounts`, os UUIDs/saldos das duas contas Revolut da Joana, se os números
batem com o que `docs/estado-atual.md` já registra (2.381 transações na
conta corrente, 1.619 na poupança), as categorias hoje em uso nas
transações da Joana, e o total de `needs_review` (baseline para medir o
ganho do `25_`).

## 24. `24_criar_conta_cgd_e_importar.sql`

Gerado por `scripts/gerar_import_cgd_joana.py`. Cria a conta CGD (EUR, dona
Joana) com **saldo inicial real de 187,38 €** (não é estimativa como o
Nubank — a aba "Extratos CGD" traz 12 meses encadeados sem quebra, todos
"Confirmado por PDF" contra o extrato oficial) e importa as 96 transações
da aba "CGD Ano Completo". Dedup pelo `ID CGD` da própria planilha
(`JCGD-AAAAMM-NNNN`) como `external_id` — idempotente.

**Os 36 pares "Transferência interna" (CGD ↔ Revolut) entram como
despesa/receita comuns, não como `type='transferencia'`.** O lado Revolut
de cada par já foi importado em 2026-08-03 como receita/despesa solta
(não havia CGD no app na época). Gravar agora o lado CGD como transferência
de verdade duplicaria o movimento na conta Revolut. Vão para a categoria
"Transferências internas" (nome mapeado a partir do "Transferência interna"
singular do Excel — ver decisão de nome abaixo), que o dashboard já exclui
do resultado por `CATEGORIAS_FORA_DO_RESULTADO`.

**Nome da categoria "Transferência interna" → "Transferências internas".**
O CGD usa o singular; o app reconhece o plural para excluir do dashboard
(`src/lib/constants.ts`). Importar com o nome do Excel ao pé da letra
recriaria o mesmo bug já corrigido em `08_unificar_categorias_duplicadas.sql`
— duas categorias pro mesmo conceito, uma escapando do filtro.

Saldo calculado pelo próprio script bate exato com os 6,44 € que a aba
"Extratos CGD" registra para o fim do período (jun/2026) — conferido antes
de rodar.

## 25. `25_atualizar_categorias_joana_revolut.sql` — SUPERADO, ver 25/26/27/28 abaixo

Tentativa original (`--modo categorias`, ainda no script como referência
histórica): SQL monolítico com as 2.859 linhas do Excel embutidas em
`values (...)` — repetido 3× (uma por statement), ~8.800 linhas / ~600 KB.
Colar isso no SQL Editor do Supabase falhou consistentemente com
`ERRO 42601: syntax error at end of input` / `LINE 0:` vazio (paste de
~600 KB não chegava inteiro ao navegador), mesmo dividido ao meio. Trocado
pela abordagem CSV + tabela staging abaixo — o arquivo antigo fica no
repo só de registro, não editar nem tentar rodar.

**Não casa por fingerprint** (nem a versão antiga nem a nova). A descrição
gravada no banco tem um sufixo que a planilha não tem — ex. banco:
`"Payment from DR JOHN CLARKE [Categoria original Revolut: Top up]"`,
Excel: `"Payment from DR JOHN CLARKE"` (confirmado consultando o banco
nesta sessão, 2026-08-06). Hash de string completa nunca bateria. Casa por
**data + valor + tipo + descrição normalizada como prefixo**
(`public.normalize_description(t.description) like
public.normalize_description(e.descricao) || '%'`) — funciona com ou sem
sufixo, calculado em SQL puro, sem precisar saber o UUID das contas Revolut
da Joana de antemão (resolve por `owner_profile_id`/nome).

## 25b/26/27/28 — CGD staging: a forma que funcionou

`scripts/gerar_import_cgd_joana.py` ganhou os modos `categorias-csv`,
`categorias-diagnostico` e `categorias-update`, que tiram os dados do corpo
do SQL:

- **`25_criar_staging_categorias.sql`** (reescrito, escrito à mão, ~15
  linhas) — cria `public._sync_joana_categorias` (tabela solta, sem RLS, só
  para esta sincronização) e trunca.
- **`joana_categorias_excel.csv`** (`supabase/joana_categorias_excel.csv`,
  gerado por `--modo categorias-csv`) — as mesmas 2.859 linhas, agora como
  CSV. Importar pelo **Table Editor do Supabase → `_sync_joana_categorias`
  → Insert → Import data from CSV** — upload de arquivo, não depende de
  colar texto no navegador.
- **`26_diagnosticar_categorias_joana_passo1.sql`** (gerado por
  `--modo categorias-diagnostico`, ~90 linhas) — mesmo `select` de
  conferência de antes, agora lendo `public._sync_joana_categorias` em vez
  de embutir os dados. Rodado em 2026-08-06: 355 "será atualizada" com
  `needs_review=true`, 1.422 já revisadas (`needs_review=false`) com
  categoria divergente, 129 já corretas, 148 ambíguas (recorrência/
  duplicata, nunca tocadas), 805 sem correspondência (a maioria é juro
  diário de poupança — "Interest earned - Flexible Cash Funds" —, que a
  planilha não detalha linha a linha).
- **`27_atualizar_categorias_joana_revolut.sql`** (gerado por
  `--modo categorias-update`, ~150 linhas) — os mesmos dois `update` de
  antes, só sobre match único (nunca ambíguo, nunca sem correspondência):
  atualiza `category_id` onde a categoria do Excel diverge da atual, depois
  zera `needs_review` nas linhas que estavam `true`. **Inclui as 1.422 já
  revisadas** (`needs_review=false`) por decisão explícita do Gabriel em
  2026-08-06, depois de ver o tamanho desse balde no PASSO 1 — preferiu
  aplicar tudo de uma vez a deixar pendente. O que continua de fora,
  sempre: match ambíguo e sem correspondência — mesmo tratamento dado aos
  grupos ambíguos de `03_seed_pessoas.sql`.
- **`28_limpar_staging_categorias.sql`** (escrito à mão, 1 linha) —
  `drop table` da staging depois de conferir que o `27_` rodou certo.

Ordem: `25_` → importar o CSV → `26_` (conferir) → `27_` (aplicar) → `28_`
(limpar).

### Bug real encontrado e corrigido (2026-08-06, mesma sessão)

A primeira rodada do `27_` fez `INNER JOIN` com `public.categories` no
`update` de `category_id` — categoria do Excel que não existisse no app
(ex. "lazer" minúsculo, "Custo financeiro", "Ajuda Familiar", nomes que a
planilha usa e o app não) fazia a linha ser **ignorada silenciosamente**,
sem erro. Pior: o segundo `update` (zera `needs_review`) não passava pelo
mesmo join, então marcava a transação como revisada mesmo sem ter
corrigido a categoria de verdade — escondia da fila de revisão algo que
continuava errado.

Corrigido em duas frentes:
1. **`CATEGORIA_MAP_REVOLUT`** (novo, em `gerar_import_cgd_joana.py`) —
   mapeia as combinações (categoria, tipo) da planilha para uma categoria
   **já existente** no app, levantado comparando contra a lista real de
   `public.categories` do casal. Nunca cria categoria nova; o que não tem
   equivalente claro cai em "Outras despesas"/"Outras receitas" (decisão do
   Gabriel). Regressão própria corrigida no caminho: a entrada
   `"Transferência interna"` (sem sufixo, 151 linhas — "To Joana Palminha"/
   "Payment from JOANA FILIPA COSTA PALMINHA") tinha ficado de fora da
   primeira versão do mapa.
2. **`candidatos` agora exige `categoria_alvo_existe`** (`montar_cte_staging()`)
   — uma linha só entra em "candidatos" (elegível pro `update`, dos dois
   tipos) se a categoria alvo realmente existir em `public.categories` para
   aquele casal. O `26_` ganhou uma situação nova, `'categoria não existe no
   app'`, pra esse problema nunca mais passar despercebido — se aparecer,
   é sinal de faltar entrada em `CATEGORIA_MAP_REVOLUT`.

## Pendência desta leva

- [x] ~~Trading 212 (206 transações) e ActivoBank (72 transações)~~ — ver
      seção "29/30" abaixo.
- [ ] O único registro CGD marcado `needs_review = true` (categoria
      "Outros") — revisar manualmente pela tela `/revisar`.

## 29/30 — Trading 212 e ActivoBank da Joana

Mesma planilha, mesma aba "Joana Atualizada" (`Banco = 'Trading 212'` /
`'ActivoBank'`). Gerados pelos modos novos `--modo trading212` e
`--modo activobank` de `gerar_import_cgd_joana.py`, que reaproveitam a
função genérica `gerar_import_banco()` (conta + categorias + transações
num só `begin;`/`commit;`, igual ao `24_` do CGD — **sem CSV/staging**:
206 e 72 linhas cabem tranquilo num `insert ... values` só, o problema de
paste gigante só apareceu no caso da sincronização de categoria porque
repetia 2.859 linhas três vezes).

- **`29_criar_conta_trading212_e_importar.sql`** — conta "Trading 212"
  (mistura cartão + investimento, é uma conta só na planilha), 206
  lançamentos, 27 marcados `needs_review` (`Estado` da planilha diferente
  de "Reconciliado"/"Pareado", ou categoria "Compras com cartão —
  revisar"). Dedup pelo `ID` da planilha quando existe (197/206) — as 9
  linhas de dividendo pequeno sem `ID` dependem só do `fingerprint`
  automático do trigger, então rodar o script duas vezes pode duplicar
  essas 9 (documentado, risco baixo).
- **`30_criar_conta_activobank_e_importar.sql`** — conta "ActivoBank", 72
  lançamentos, 11 marcados `needs_review`. `ID` 100% preenchido e único
  (`ACT-AAAAMMDD-NNN`) — dedup limpa, sem exceção.

**Sem saldo inicial confirmado por extrato** (diferente do CGD) — a
planilha não tem uma aba "Extratos Trading 212"/"Extratos ActivoBank" com
reconciliação por PDF. Saldo inicial = 0 pras duas, mesma decisão já usada
pro Nubank; ajustar manualmente em `/contas` quando o Gabriel/Joana
souberem o saldo real. O `stderr` de cada script imprime créditos/débitos
pra conferência cruzada contra a aba "Resumo 12M" da planilha — só que essa
aba é recortada a jul/2025–jun/2026, então os números batem só
aproximadamente: 12 lançamentos do Trading 212 e 6 do ActivoBank são de
jul/ago-2026, fora dessa janela, e entram no import mesmo assim (dado mais
completo, não é divergência).

**Compras de investimento no Trading 212** ("Market buy"): a planilha
separa o valor total da compra do "custo econômico" (só a taxa embutida,
o principal é tratado como movimento patrimonial). O import usa o
**valor bancário total**, categoria "Investimentos" — mesmo tratamento já
dado ao Nubank (conta certa pro saldo da conta bater; separar posição por
ativo é o que a tela `/investimentos` já faz à parte, via
`investment_holdings`, não este import).

## 31. `31_corrigir_deposito_prazo_activobank.sql`

Achado pelo Gabriel depois do `30_` já ter rodado: a constituição do
Depósito a Prazo do ActivoBank (-9.000 €, `external_id ACT-20260123-006`)
tinha sido categorizada "Transferências internas" — errado, é investimento
de verdade (dinheiro comprometido num produto), mesmo tratamento que já
dei às compras do Trading 212. Os juros e o imposto sobre esse depósito já
tinham entrado certos ("Rendimentos"/"Investimentos"); só essa 1 linha
precisava de correção. `CATEGORIA_MAP_ACTIVOBANK` corrigido no script pra
não repetir o erro se `30_` for regenerado do zero.

Transferências já pareadas com o Revolut da Joana (ex: "TRF. P/O Joana
Palminha" no ActivoBank, "Deposit"/"Withdraw to bank" no Trading 212)
entram como despesa/receita comum, categoria "Transferências internas" —
mesma decisão do CGD, pra não duplicar o lado que já está importado no
Revolut.

`CATEGORIA_MAP_TRADING212` e `CATEGORIA_MAP_ACTIVOBANK` seguem a mesma
regra do `CATEGORIA_MAP_REVOLUT`: só mapeia pra categoria que já existe no
app, nunca cria nova; sem equivalente claro cai em "Outras despesas"/
"Outras receitas".

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
# 24:
python scripts/gerar_import_cgd_joana.py "C:\Users\ggarc\Downloads\Joana_Ano_Completo_12M_Todos_Meses_Confirmados.xlsx" > supabase/aplicar/24_criar_conta_cgd_e_importar.sql
# 25 (versão antiga, superada — só de registro):
python scripts/gerar_import_cgd_joana.py --modo categorias "C:\Users\ggarc\Downloads\Joana_Ano_Completo_12M_Todos_Meses_Confirmados.xlsx" > supabase/aplicar/25_atualizar_categorias_joana_revolut.sql
# joana_categorias_excel.csv:
python scripts/gerar_import_cgd_joana.py --modo categorias-csv "C:\Users\ggarc\Downloads\Joana_Ano_Completo_12M_Todos_Meses_Confirmados.xlsx" supabase/joana_categorias_excel.csv
# 26:
python scripts/gerar_import_cgd_joana.py --modo categorias-diagnostico > supabase/aplicar/26_diagnosticar_categorias_joana_passo1.sql
# 27:
python scripts/gerar_import_cgd_joana.py --modo categorias-update > supabase/aplicar/27_atualizar_categorias_joana_revolut.sql
# 29:
python scripts/gerar_import_cgd_joana.py --modo trading212 "C:\Users\ggarc\Downloads\Joana_Ano_Completo_12M_Todos_Meses_Confirmados.xlsx" > supabase/aplicar/29_criar_conta_trading212_e_importar.sql
# 30:
python scripts/gerar_import_cgd_joana.py --modo activobank "C:\Users\ggarc\Downloads\Joana_Ano_Completo_12M_Todos_Meses_Confirmados.xlsx" > supabase/aplicar/30_criar_conta_activobank_e_importar.sql
```

Os `07`, `08`, `09`, `11`, `23`, `25` (staging) e `28` foram escritos à mão
e podem ser editados diretamente.
