-- DIAGNOSTICO — nao altera nada. Roda inteiro e confere os 4 resultados.
--
-- Conciliacao entre o banco do app e o Excel do GPT
-- (centralizador_financeiro_com_carros_antigos_e_pendencias.xlsx, 2026-08-05).
--
-- A comparacao foi feita sobre os CSVs exportados pelo app + os scripts de
-- import em Documents\Contas casal. Este arquivo existe para CONFIRMAR no
-- banco cada achado antes de qualquer UPDATE (08_ e 09_).
--
-- Se algum resultado vier diferente do esperado, PARAR e reavaliar — os
-- scripts seguintes assumem que os numeros abaixo batem.

-- ---------------------------------------------------------------------------
-- 1. Categorias duplicadas por acento
-- ---------------------------------------------------------------------------
-- Esperado: pelo menos 1 grupo com 2 linhas — "Transferências internas"
-- (com acento) e "Transferencias internas" (sem). A constante
-- CATEGORIAS_FORA_DO_RESULTADO em src/lib/constants.ts so conhece a primeira,
-- entao as transacoes da segunda entram no resultado do dashboard como se
-- fossem receita/despesa real.
--
-- A coluna `fora_do_resultado_hoje` mostra qual das duas o app filtra.

with grupos as (
  select
    c.couple_id,
    c.kind,
    public.normalize_description(c.name) as nome_normalizado,
    count(*) as grafias
  from public.categories c
  where not c.archived
  group by 1, 2, 3
  having count(*) > 1
)
select
  c.kind,
  g.nome_normalizado,
  c.name        as grafia_real,
  c.id          as category_id,
  c.name in ('Transferências internas', 'Saques e dinheiro')
                as fora_do_resultado_hoje,
  count(t.id)   as transacoes,
  coalesce(sum(t.amount_primary_cents), 0) / 100.0 as total_moeda_primaria
from grupos g
join public.categories c
  on c.couple_id = g.couple_id
 and c.kind = g.kind
 and public.normalize_description(c.name) = g.nome_normalizado
left join public.transactions t on t.category_id = c.id
group by c.kind, g.nome_normalizado, c.name, c.id
order by g.nome_normalizado, c.kind, c.name;

-- ---------------------------------------------------------------------------
-- 2. Contas com nome ambiguo entre os dois titulares
-- ---------------------------------------------------------------------------
-- Esperado: duas contas chamadas 'Revolut' (uma do Gabriel, uma da Joana),
-- separadas so por owner_profile_id. Mesmo padrao em 'Revolut Poupança'
-- (Gabriel) vs 'Revolut Poupanca' (Joana) — diferem so pela cedilha.
--
-- O export CSV de /transacoes nao tem coluna de titular, entao hoje nao da
-- para saber de quem e cada linha.

select
  a.name,
  a.currency,
  a.type,
  a.archived,
  coalesce(u.email, '(conta conjunta)') as titular,
  a.initial_balance_cents / 100.0 as saldo_inicial,
  count(t.id) as transacoes,
  min(t.occurred_on) as primeira,
  max(t.occurred_on) as ultima
from public.accounts a
left join auth.users u on u.id = a.owner_profile_id
left join public.transactions t on t.account_id = a.id
group by a.id, a.name, a.currency, a.type, a.archived, u.email
order by public.normalize_description(a.name), titular;

-- ---------------------------------------------------------------------------
-- 3. Carros — o que esta no banco hoje
-- ---------------------------------------------------------------------------
-- Comparar contra a aba "Carros Consolidado" do Excel:
--
--   Veiculo               compra   custos    venda    lucro
--   Nissan Qashqai 2010    1500     67,85     3350   1782,15
--   Ford Ka 2010           1600    116,34     2900   1183,66
--   Ford Focus 2010         700    634,71     2900   1565,29
--   Hyundai ix35 2012      3100   1302,40     4700    297,60
--   Nissan Qashqai 2011    1200    211,53     3400   1988,47
--   Opel Corsa 2010        1050    549,69     2000    400,31
--   TOTAIS                 9150   2882,52    19250   7217,48
--
-- Divergencias esperadas no banco (a serem corrigidas pelo 09_):
--   - ix35 cadastrado com make = 'Honda'; o certo e 'Hyundai'.
--   - Qashqai 2011 com compra 1350; o Excel achou 1200 no extrato.
--   - Custos totais 2478,40 no banco vs 2882,52 no Excel (-404,12).

select
  v.make || ' ' || v.model || ' ' || coalesce(v.year::text, '') as veiculo,
  v.status,
  v.purchase_price_cents / 100.0 as compra,
  v.purchase_date,
  v.sale_price_cents / 100.0 as venda,
  v.sale_date,
  v.buyer_name,
  coalesce(custos.total, 0) / 100.0 as custos_cadastrados,
  coalesce(custos.qtd, 0) as qtd_custos,
  coalesce(links.qtd, 0) as transacoes_vinculadas,
  (coalesce(v.sale_price_cents, 0) - v.purchase_price_cents
     - coalesce(custos.total, 0)) / 100.0 as lucro
from public.vehicles v
left join lateral (
  select sum(vc.amount_cents) as total, count(*) as qtd
  from public.vehicle_costs vc where vc.vehicle_id = v.id
) custos on true
left join lateral (
  select count(*) as qtd
  from public.vehicle_transaction_links vl where vl.vehicle_id = v.id
) links on true
order by v.purchase_date;

-- ---------------------------------------------------------------------------
-- 4. Transacoes-ancora dos carros que faltam
-- ---------------------------------------------------------------------------
-- A aba "Carros Antigos" do Excel tem 8 veiculos de 2025 que nao existem no
-- banco. Seis das compras JA ESTAO em `transactions`, largadas em "Outras
-- despesas" — sao as mesmas linhas que a aba "Q4 Saidas Carros" lista.
--
-- Esta query procura cada uma por valor exato + janela de data. Confere:
--   - se cada ancora aparece UMA vez (se aparecer mais, o 09_ nao pode casar
--     por descricao+valor sem desempate);
--   - se ja tem vinculo de veiculo (nao deveria ter);
--   - a categoria atual (esperado: Outras despesas).
--
-- MARTIN SAMAGLO e o unico dos 6 atuais: e a compra do Qashqai 2011, hoje
-- solta. Fecha tambem a pendencia manual nº 1 do HANDOFF_CLAUDE_CONCILIACAO.

with ancoras(pessoa, veiculo, valor_cents, data_ref) as (
  values
    ('martin samaglo',              'Nissan Qashqai 2011 (compra faltando)', 120000, date '2026-01-11'),
    ('margaret pauline sutton',     'Opel Corsa 2009',                       130000, date '2025-02-09'),
    ('maria zoraida cano gonzalez', 'Ford Fiesta marrom',                     55000, date '2025-06-01'),
    ('darra o connell',             'Renault Clio',                          128000, date '2025-08-23'),
    ('estefania torres esquivel',   'Mitsubishi Swift',                      120000, date '2025-09-24'),
    ('mindaugas paskevicius',       'Mitsubishi Lancer',                     170000, date '2025-11-24')
)
select
  a.veiculo,
  a.valor_cents / 100.0 as valor_esperado,
  a.data_ref            as data_esperada,
  t.id                  as transaction_id,
  t.occurred_on,
  t.description,
  t.amount_cents / 100.0 as valor_real,
  t.type,
  cat.name              as categoria_atual,
  acc.name              as conta,
  exists (
    select 1 from public.vehicle_transaction_links vl
    where vl.transaction_id = t.id
  ) as ja_vinculada
from ancoras a
left join public.transactions t
  on t.amount_cents = a.valor_cents
 and t.type = 'despesa'
 and t.occurred_on between a.data_ref - 3 and a.data_ref + 3
 and public.normalize_description(t.description) like '%' || a.pessoa || '%'
left join public.categories cat on cat.id = t.category_id
left join public.accounts acc on acc.id = t.account_id
order by a.data_ref;
