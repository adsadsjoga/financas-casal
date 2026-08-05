-- ALTERA DADOS. Idempotente e seguro contra ID obsoleto (inner join com
-- `transactions`, nunca insert cego). IDs colhidos agora mesmo por
-- 17_diagnosticar_gaps_restantes.sql — rodar o quanto antes: os IDs de
-- rodadas anteriores desta sessao ficaram obsoletos entre a busca e o uso
-- por duas vezes ja (ambiente com escrita concorrente, ver docs/estado-
-- atual.md "trabalho nao commitado e fragil").

begin;

insert into public.vehicle_transaction_links (couple_id, vehicle_id, transaction_id, role)
select v.couple_id, v.id, t.id, x.role
from (values
  ('Opel',       'Corsa',   2009, 130000, '680135ed-e9a1-4622-b2c1-50ae4072a2ab'::uuid, 'compra'),
  ('Ford',       'Fiesta',  null,  55000, '12b69784-5c68-4d01-9ab6-4f58eb5294b6'::uuid, 'compra'),
  ('Renault',    'Clio',    null, 128000, '02889ac2-d7d8-4dcf-9177-dc0fb3c710df'::uuid, 'compra'),
  ('Mitsubishi', 'Swift',   null, 120000, '4aec7986-858c-49e9-87b8-094d9a928251'::uuid, 'compra'),
  ('Mitsubishi', 'Lancer',  null, 170000, '450570d2-cb85-45e6-899e-79134b60e1a2'::uuid, 'compra'),
  ('Nissan',     'Qashqai', 2011, 120000, 'b17d9ab8-ab6c-430e-a322-911311e26aef'::uuid, 'compra'),
  ('Ford',       'Focus',   2010,  70000, '35f21a14-6e02-4b2a-a06e-a953398cebb3'::uuid, 'custo'),
  ('Opel',       'Corsa',   2010, 105000, '5c2762cb-b78d-47a6-9708-ee6538f5ca93'::uuid, 'custo')
) as x(make, model, ano, compra_cents, transaction_id, role)
join public.vehicles v
  on v.make = x.make and v.model = x.model
 and v.purchase_price_cents = x.compra_cents
 and v.year is not distinct from x.ano
join public.transactions t on t.id = x.transaction_id
on conflict (vehicle_id, transaction_id, role) do nothing;

update public.transactions t
set category_id = c.id, needs_review = false
from public.categories c, public.vehicle_transaction_links vl
where vl.transaction_id = t.id
  and vl.role in ('compra', 'custo')
  and t.id in (
    '680135ed-e9a1-4622-b2c1-50ae4072a2ab', '12b69784-5c68-4d01-9ab6-4f58eb5294b6',
    '02889ac2-d7d8-4dcf-9177-dc0fb3c710df', '4aec7986-858c-49e9-87b8-094d9a928251',
    '450570d2-cb85-45e6-899e-79134b60e1a2', 'b17d9ab8-ab6c-430e-a322-911311e26aef',
    '35f21a14-6e02-4b2a-a06e-a953398cebb3', '5c2762cb-b78d-47a6-9708-ee6538f5ca93'
  )
  and c.couple_id = t.couple_id
  and c.kind = 'despesa'
  and public.normalize_description(c.name) = 'carro'
  and not c.archived
  and t.category_id is distinct from c.id;

commit;

-- ===========================================================================
-- CONFERENCIA
-- ===========================================================================
-- 1. Os 8 pares tem que aparecer aqui.
select
  v.make || ' ' || v.model || coalesce(' ' || v.year, '') as veiculo,
  vl.role,
  t.description,
  t.amount_cents / 100.0 as valor,
  cat.name as categoria_apos
from public.vehicle_transaction_links vl
join public.vehicles v on v.id = vl.vehicle_id
join public.transactions t on t.id = vl.transaction_id
left join public.categories cat on cat.id = t.category_id
where vl.transaction_id in (
  '680135ed-e9a1-4622-b2c1-50ae4072a2ab', '12b69784-5c68-4d01-9ab6-4f58eb5294b6',
  '02889ac2-d7d8-4dcf-9177-dc0fb3c710df', '4aec7986-858c-49e9-87b8-094d9a928251',
  '450570d2-cb85-45e6-899e-79134b60e1a2', 'b17d9ab8-ab6c-430e-a322-911311e26aef',
  '35f21a14-6e02-4b2a-a06e-a953398cebb3', '5c2762cb-b78d-47a6-9708-ee6538f5ca93'
)
order by t.occurred_on;

-- 2. Status geral final — repete a consulta de 16_. Esperado agora: so o
--    Volkswagen Polo, o Renault Fluence e o Ford Fiesta vermelho sem
--    compra vinculada (nenhum tem transacao bancaria — saida em dinheiro
--    ou do cofre), e o Opel Corsa 2010 sem compra (idem).
select
  v.make || ' ' || v.model || coalesce(' ' || v.year, '') as veiculo,
  coalesce(links.compras, 0) as compras_vinculadas,
  coalesce(links.custos, 0) as custos_vinculados
from public.vehicles v
left join lateral (
  select
    count(*) filter (where vl.role = 'compra') as compras,
    count(*) filter (where vl.role = 'custo') as custos
  from public.vehicle_transaction_links vl where vl.vehicle_id = v.id
) links on true
order by v.purchase_date;
