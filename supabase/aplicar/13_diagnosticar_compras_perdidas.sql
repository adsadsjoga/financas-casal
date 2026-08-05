-- DIAGNOSTICO — nao altera nada.
--
-- O 12_revincular_compras_originais_perdidas.sql nao achou nenhuma transacao
-- para os 4 carros (Qashqai 2010, Ford Ka, Ford Focus, Hyundai ix35), usando
-- a descricao+valor+data documentados em docs/carros.md desde 2026-08-02.
-- Isso pode significar duas coisas:
--   a) a transacao existe, mas com data ou descricao diferente do que ficou
--      registrado (a reconstrucao do Revolut em 2026-08-03 pode ter mudado
--      a data — a mesma nota de docs/estado-atual.md fala em "1 dia de
--      diferenca" por usar Completed Date em vez de Started Date, mas pode
--      ter sido mais);
--   b) a transacao simplesmente nao esta mais no banco.
--
-- Este script busca de duas formas mais largas, SEM cruzar as duas: por
-- valor exato (qualquer data, qualquer descricao) e por nome do vendedor
-- (qualquer valor, qualquer data). Se um vendedor nao aparecer em nenhuma
-- das duas buscas, o caso e (b).

-- 1. Por valor exato — qualquer despesa de 1500, 1600, 700 ou 3100 em toda a
--    conta. Se o vendedor certo estiver aqui, da pra ver a descricao real.
select
  'valor' as busca,
  t.id as transaction_id,
  t.occurred_on,
  t.description,
  t.amount_cents / 100.0 as valor,
  a.name as conta,
  cat.name as categoria_atual,
  exists (
    select 1 from public.vehicle_transaction_links vl where vl.transaction_id = t.id
  ) as ja_vinculada
from public.transactions t
join public.accounts a on a.id = t.account_id
left join public.categories cat on cat.id = t.category_id
where t.type = 'despesa'
  and t.amount_cents in (150000, 160000, 70000, 310000)
order by t.amount_cents, t.occurred_on;

-- 2. Por nome do vendedor — qualquer valor, qualquer data. Se a transacao
--    mudou de valor (improvavel, mas possivel se a reconstrucao recalculou
--    Amount - Fee), aparece aqui mesmo assim.
select
  'vendedor' as busca,
  t.id as transaction_id,
  t.occurred_on,
  t.description,
  t.amount_cents / 100.0 as valor,
  a.name as conta,
  cat.name as categoria_atual,
  exists (
    select 1 from public.vehicle_transaction_links vl where vl.transaction_id = t.id
  ) as ja_vinculada
from public.transactions t
join public.accounts a on a.id = t.account_id
left join public.categories cat on cat.id = t.category_id
where public.normalize_description(t.description) like any (array[
  '%jamie slater%',
  '%thomas patrick enright%',
  '%thomas enright%',
  '%geraldine mary mullane%',
  '%geraldine mullane%',
  '%kamelia khalfi%'
])
order by t.occurred_on;

-- 3. Confirma que a query 1 do 12_ (vehicle-side) achava os 4 carros certos
--    — descarta erro no join com `vehicles`, isola o problema em `transactions`.
select
  v.id as vehicle_id,
  v.make,
  v.model,
  v.year,
  v.purchase_price_cents / 100.0 as compra,
  v.purchase_date
from public.vehicles v
where (v.make, v.model, v.purchase_price_cents) in (
  ('Nissan', 'Qashqai', 150000),
  ('Ford', 'Ka', 160000),
  ('Ford', 'Focus', 70000)
)
or public.normalize_description(v.make || ' ' || v.model) = 'hyundai ix35';
