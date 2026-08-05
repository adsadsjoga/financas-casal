-- DIAGNOSTICO — nao altera nada.
--
-- Agrupa as transacoes de categoria "Viagem"/"Viagens" (dos DOIS titulares,
-- todas as contas) por proximidade de data, pra depois virarem projetos.
--
-- O levantamento feito nesta sessao sobre os exports do app (so dados do
-- Gabriel, extraidos de CSV, fora do banco) achou 25 transacoes, ~8 clusters.
-- Esta query e a fonte de verdade de verdade — roda direto no banco, cobre
-- a Joana tambem, e usa o `kind` correto (so despesa entra como custo de
-- viagem; entrada da mesma categoria, se existir, e reembolso e fica de
-- fora do agrupamento por enquanto).
--
-- Corte de cluster: gap > 14 dias da transacao anterior (mesma logica do
-- levantamento offline). Ajustar o "interval '14 days'" abaixo se algum
-- cluster ficar visivelmente errado.

-- 1. Transacoes de viagem com o gap da anterior e o numero do cluster.
with viagem as (
  select
    t.id,
    t.occurred_on,
    t.description,
    t.amount_primary_cents,
    t.account_id,
    a.name as conta,
    a.owner_profile_id,
    coalesce(u.email, '(conjunta)') as titular,
    t.occurred_on - lag(t.occurred_on) over (order by t.occurred_on) as gap_dias
  from public.transactions t
  join public.categories cat on cat.id = t.category_id
  join public.accounts a on a.id = t.account_id
  left join auth.users u on u.id = a.owner_profile_id
  where t.type = 'despesa'
    and public.normalize_description(cat.name) like 'viage%'
),
com_cluster as (
  select
    *,
    sum(case when gap_dias is null or gap_dias > 14 then 1 else 0 end)
      over (order by occurred_on) as cluster_id
  from viagem
)
select
  cluster_id,
  min(occurred_on) as inicio,
  max(occurred_on) as fim,
  count(*) as transacoes,
  sum(amount_primary_cents) / 100.0 as total,
  string_agg(distinct titular, ', ') as titulares,
  string_agg(description || ' (' || (amount_primary_cents/100.0)::text || ')', ' · ' order by occurred_on) as detalhe
from com_cluster
group by cluster_id
order by inicio;

-- 2. Confirma se o Booking.com de €283,94 (2026-06-10) e vizinho de alguma
--    transacao ja vinculada ao projeto "Casamento — Søborg/Copenhaga" —
--    se vier alguma linha aqui, ele entra NESSE projeto, nao num novo.
select
  t.id as booking_id,
  t.occurred_on as data_booking,
  pt_outro.transaction_id as transacao_do_casamento,
  t2.occurred_on as data_transacao_casamento,
  t2.description,
  abs(t.occurred_on - t2.occurred_on) as dias_de_diferenca
from public.transactions t
join public.project_transactions pt_outro on true
join public.transactions t2 on t2.id = pt_outro.transaction_id
join public.projects p on p.id = pt_outro.project_id
where t.type = 'despesa'
  and t.amount_cents = 28394
  and t.description ilike '%booking%'
  and p.name = 'Casamento — Søborg/Copenhaga'
order by dias_de_diferenca;

-- 3. Se a query 2 veio vazia, mostra o lancamento do Booking.com sozinho
--    (confirma que ele existe e com que id) pra decidir manualmente.
select id, occurred_on, description, amount_cents / 100.0 as valor
from public.transactions
where type = 'despesa' and amount_cents = 28394 and description ilike '%booking%';
