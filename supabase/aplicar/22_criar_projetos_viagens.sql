-- ALTERA DADOS. Idempotente (on conflict do nothing nos dois inserts).
--
-- Cria 1 projeto por viagem a partir dos clusters confirmados em
-- 21_diagnosticar_viagens.sql (rodado em 2026-08-08, 11 clusters).
--
-- NAO usa transaction_id hardcoded: recalcula os clusters com a mesma window
-- function do diagnostico, dentro do proprio insert. Ids colhidos numa
-- consulta e usados noutra ficaram obsoletos duas vezes nesta sessao
-- (ambiente com escrita concorrente) — aqui o dado e lido e usado no mesmo
-- statement, entao nao ha janela pra isso.
--
-- SEM TEMP VIEW/TABLE DE PROPOSITO: o SQL Editor do Supabase passa pelo
-- pgbouncer em modo transacao e nao garante a mesma conexao entre statements
-- — foi o que quebrou o 08_ ("relation does not exist") mesmo dentro de
-- begin/commit. A CTE `clusters` e repetida em cada statement porque CTE nao
-- depende de sessao.
--
-- DECISAO IMPORTANTE — cluster 11 (10/06 a 30/06/2026, EUR 1.416,58):
-- e a viagem do CASAMENTO, nao uma viagem nova. Prova: o Airbnb de 640,80
-- (11/06) dentro desse cluster e exatamente a transacao que
-- 11_projetos_do_xlsx.sql ja vinculou ao projeto "Casamento — Søborg/
-- Copenhaga", vinda da aba "Divisões 50-50" da planilha. As outras 7
-- transacoes do cluster (2 Booking.com, 2 Airbnb, 3 Ryanair) entram NESSE
-- projeto em vez de criar um novo.
--
-- NOMES PROVISORIOS: "Viagem DD/MM/AAAA" (data do primeiro lancamento do
-- cluster — unico por construcao, dois clusters nao comecam no mesmo dia).
-- So o cluster 5 tem pista de destino no proprio extrato (Killarney Plaza
-- Hotel). Renomear pelo app; inventar destino sem evidencia seria dado
-- errado que ninguem conferiria depois.

begin;

-- 1. Um projeto por cluster, menos o do casamento (>= 2026-06-10).
with viagem as (
  select
    t.id, t.couple_id, t.occurred_on,
    t.occurred_on - lag(t.occurred_on) over (order by t.occurred_on) as gap_dias
  from public.transactions t
  join public.categories cat on cat.id = t.category_id
  where t.type = 'despesa'
    and public.normalize_description(cat.name) like 'viage%'
),
clusters as (
  select id, couple_id, occurred_on,
    sum(case when gap_dias is null or gap_dias > 14 then 1 else 0 end)
      over (order by occurred_on) as cluster_id
  from viagem
)
insert into public.projects (couple_id, name, icon, kind)
select
  c.couple_id,
  'Viagem ' || to_char(min(c.occurred_on), 'DD/MM/YYYY'),
  '✈️',
  'pessoal'
from clusters c
group by c.couple_id, c.cluster_id
having min(c.occurred_on) < date '2026-06-10'
on conflict (couple_id, name) do nothing;

-- 2. Vincula cada transacao ao projeto do seu cluster.
with viagem as (
  select
    t.id, t.couple_id, t.occurred_on,
    t.occurred_on - lag(t.occurred_on) over (order by t.occurred_on) as gap_dias
  from public.transactions t
  join public.categories cat on cat.id = t.category_id
  where t.type = 'despesa'
    and public.normalize_description(cat.name) like 'viage%'
),
clusters as (
  select id, couple_id, occurred_on,
    sum(case when gap_dias is null or gap_dias > 14 then 1 else 0 end)
      over (order by occurred_on) as cluster_id
  from viagem
),
inicio_do_cluster as (
  select cluster_id, couple_id, min(occurred_on) as inicio
  from clusters
  group by cluster_id, couple_id
)
insert into public.project_transactions (project_id, transaction_id)
select p.id, c.id
from clusters c
join inicio_do_cluster i
  on i.cluster_id = c.cluster_id and i.couple_id = c.couple_id
join public.projects p
  on p.couple_id = c.couple_id
 and p.name = 'Viagem ' || to_char(i.inicio, 'DD/MM/YYYY')
on conflict (project_id, transaction_id) do nothing;

-- 3. Cluster do casamento: as 7 transacoes soltas entram no projeto que ja
--    existe, junto do Airbnb 640,80 que ja estava la.
insert into public.project_transactions (project_id, transaction_id)
select p.id, t.id
from public.transactions t
join public.categories cat on cat.id = t.category_id
join public.projects p
  on p.couple_id = t.couple_id
 and p.name = 'Casamento — Søborg/Copenhaga'
where t.type = 'despesa'
  and public.normalize_description(cat.name) like 'viage%'
  and t.occurred_on >= date '2026-06-10'
on conflict (project_id, transaction_id) do nothing;

commit;

-- ===========================================================================
-- CONFERENCIA — rodar UMA DE CADA VEZ (o SQL Editor so mostra o resultado do
-- ultimo select quando se roda o arquivo inteiro).
-- ===========================================================================

-- A. Todos os projetos com o que ficou dentro. Esperado:
--    - 10 projetos "Viagem DD/MM/AAAA" novos, 26 lancamentos, EUR 1.820,83
--    - "Casamento — Søborg/Copenhaga" sobe de 3 para 10 lancamentos
--      (as 7 novas somam 775,78; o Airbnb de 640,80 ja estava la)
--    - os outros 2 projetos da planilha (Seguro automovel, Carros — Hyundai
--      ix35) inalterados
--    Obs: o total do casamento nao e 1.654,03 + 775,78 porque parte dos
--    1.654,03 (camera e maquilhagem) nao e categoria "Viagem" — os numeros
--    se somam, mas conferir pela contagem de lancamentos, nao pelo total.
select
  p.name,
  p.kind,
  count(pt.transaction_id) as lancamentos,
  sum(t.amount_primary_cents) filter (where t.type = 'despesa') / 100.0 as gasto,
  min(t.occurred_on) as inicio,
  max(t.occurred_on) as fim
from public.projects p
left join public.project_transactions pt on pt.project_id = p.id
left join public.transactions t on t.id = pt.transaction_id
group by p.id, p.name, p.kind
order by min(t.occurred_on) nulls last;

-- B. Transacao de viagem que ficou sem projeto nenhum. Esperado: 0 linhas.
select t.id, t.occurred_on, t.description, t.amount_primary_cents / 100.0 as valor
from public.transactions t
join public.categories cat on cat.id = t.category_id
where t.type = 'despesa'
  and public.normalize_description(cat.name) like 'viage%'
  and not exists (
    select 1 from public.project_transactions pt where pt.transaction_id = t.id
  )
order by t.occurred_on;
