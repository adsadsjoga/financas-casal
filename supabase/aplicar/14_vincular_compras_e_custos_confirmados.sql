-- ALTERA DADOS. Idempotente (ON CONFLICT DO NOTHING).
--
-- Substitui a tentativa do 12_revincular_compras_originais_perdidas.sql, que
-- rodou sem erro mas nao criou os vinculos de compra — a causa mais provavel
-- e a segunda parte daquele script (custos do Hyundai ix35) ter falhado
-- silenciosamente ou revertido o `begin/commit` inteiro, levando junto o
-- insert de compra que teria funcionado sozinho. Em vez de depurar aquilo,
-- este script usa os IDs exatos, confirmados por 13_diagnosticar_compras_
-- perdidas.sql (queries 1 e 2) e pelo diagnostico de Sebastians Garage do
-- proprio 12_ — zero correspondencia aproximada, zero chance de reincidir.
--
-- Compras (4): Qashqai 2010, Ford Ka, Ford Focus, Hyundai ix35 — os mesmos
-- 4 vinculos que existiam desde o seed original de 02/08 e foram apagados
-- pelo ON DELETE CASCADE na reconstrucao do Revolut do Gabriel em 03/08.
--
-- Custos (2): "Sebastians Garage Limit" — 527,66 no Ford Focus, 477,55 no
-- Opel Corsa. Datas achadas no diagnostico do 12_ (09/04 e 14/06 de 2026).
--
-- NAO INCLUI os 4 custos do Hyundai ix35 (Marius Garage x2, Brendan Walsh
-- Tyres, Top Part Limited) — ainda sem transaction_id confirmado. Ver
-- diagnostico no fim do arquivo antes de um proximo script.

-- IMPORTANTE: cada par so vira link se `transaction_id` EXISTIR em
-- `transactions` neste momento (inner join, nao insert cego). Um dos IDs
-- coletados numa rodada anterior deste mesmo dia (Sebastians Garage 527,66)
-- ja nao existia mais quando o script rodou pela primeira vez — causa
-- provavel: edicao pelo app ou outra sessao trabalhando no mesmo banco (ver
-- docs/estado-atual.md, "trabalho nao commitado e fragil"). Um insert cego
-- com esse id daria erro de FK e abortaria o `begin/commit` inteiro, levando
-- junto os outros 5 pares que estavam validos. Com inner join, o par
-- obsoleto e so ignorado — a query de conferencia 3 no fim mostra qual foi.

begin;

-- Os 5 pares onde ja se sabe o vehicle_id exato.
insert into public.vehicle_transaction_links (couple_id, vehicle_id, transaction_id, role)
select v.couple_id, v.id, x.transaction_id, x.role
from (values
  ('28dcf68f-d269-4bb0-bc47-6fa70f2066f6'::uuid, '235a0e9a-96a1-48d5-a991-b394668220dd'::uuid, 'compra'), -- Ford Focus 2010 <- Geraldine Mary Mullane, 700
  ('3fe3f09b-00fb-42b1-ba57-f39082fec16b'::uuid, '4c4edb38-6ad0-4933-9819-6b1f1abaa935'::uuid, 'compra'), -- Nissan Qashqai 2010 <- Jamie Slater, 1500
  ('7490c5ad-752f-4028-b00b-eb2a92e6e73d'::uuid, 'be301472-4076-40a0-acad-3296d770b1ed'::uuid, 'compra'), -- Ford Ka 2010 <- Thomas Patrick Enright, 1600
  ('6c37e769-7330-49e6-b79c-d3d9333e27f1'::uuid, '4535b168-f5ea-43f3-9932-f88412e7b19e'::uuid, 'compra'), -- Hyundai ix35 2012 <- Kamelia Khalfi, 3100
  ('28dcf68f-d269-4bb0-bc47-6fa70f2066f6'::uuid, 'e9135801-722a-4b85-8b2e-0909598edd8c'::uuid, 'custo')   -- Ford Focus 2010 <- Sebastians Garage, 527,66
) as x(vehicle_id, transaction_id, role)
join public.vehicles v on v.id = x.vehicle_id
join public.transactions t on t.id = x.transaction_id
on conflict (vehicle_id, transaction_id, role) do nothing;

-- Opel Corsa 2010: nao tinha o vehicle_id em maos, resolvido por make/model/year.
insert into public.vehicle_transaction_links (couple_id, vehicle_id, transaction_id, role)
select v.couple_id, v.id, t.id, 'custo'
from public.vehicles v
join public.transactions t on t.id = '220dc701-a093-49ba-880c-66bb35c01ef1'::uuid
where v.make = 'Opel' and v.model = 'Corsa' and v.year = 2010
on conflict (vehicle_id, transaction_id, role) do nothing;

-- Reclassifica para 'Carro' tudo que acabou de virar compra/custo vinculado.
update public.transactions t
set category_id = c.id, needs_review = false
from public.categories c, public.vehicle_transaction_links vl
where vl.transaction_id = t.id
  and vl.role in ('compra', 'custo')
  and c.couple_id = t.couple_id
  and c.kind = 'despesa'
  and public.normalize_description(c.name) = 'carro'
  and not c.archived
  and t.category_id is distinct from c.id;

commit;

-- ===========================================================================
-- CONFERENCIA
-- ===========================================================================
-- 1. Os 6 vinculos tem que aparecer aqui.
select
  v.make || ' ' || v.model || coalesce(' ' || v.year, '') as veiculo,
  vl.role,
  t.description,
  t.amount_cents / 100.0 as valor,
  t.occurred_on,
  cat.name as categoria_apos
from public.vehicle_transaction_links vl
join public.vehicles v on v.id = vl.vehicle_id
join public.transactions t on t.id = vl.transaction_id
left join public.categories cat on cat.id = t.category_id
where vl.transaction_id in (
  '235a0e9a-96a1-48d5-a991-b394668220dd',
  '4c4edb38-6ad0-4933-9819-6b1f1abaa935',
  'be301472-4076-40a0-acad-3296d770b1ed',
  '4535b168-f5ea-43f3-9932-f88412e7b19e',
  'e9135801-722a-4b85-8b2e-0909598edd8c',
  '220dc701-a093-49ba-880c-66bb35c01ef1'
)
order by t.occurred_on;

-- 2. IDs da lista que NAO existem mais em `transactions` — por isso o par
--    nao foi linkado. Se aparecer o Sebastians Garage 527,66 aqui, precisa
--    de um novo diagnostico (a transacao mudou de id, ou foi apagada/editada
--    entre a coleta do id e agora).
select x.transaction_id, x.role
from (values
  ('235a0e9a-96a1-48d5-a991-b394668220dd'::uuid, 'compra'),
  ('4c4edb38-6ad0-4933-9819-6b1f1abaa935'::uuid, 'compra'),
  ('be301472-4076-40a0-acad-3296d770b1ed'::uuid, 'compra'),
  ('4535b168-f5ea-43f3-9932-f88412e7b19e'::uuid, 'compra'),
  ('e9135801-722a-4b85-8b2e-0909598edd8c'::uuid, 'custo'),
  ('220dc701-a093-49ba-880c-66bb35c01ef1'::uuid, 'custo')
) as x(transaction_id, role)
where not exists (select 1 from public.transactions t where t.id = x.transaction_id);

-- 3. Compras dos 6 carros originais ainda sem vinculo — esperado agora:
--    so o Opel Corsa 2010 (nao achado no extrato, provavelmente dinheiro).
select
  v.make || ' ' || v.model || coalesce(' ' || v.year, '') as veiculo,
  v.purchase_price_cents / 100.0 as compra,
  v.purchase_date
from public.vehicles v
where v.purchase_date >= date '2026-01-01'
  and v.notes not like 'Carro antigo,%'
  and not exists (
    select 1 from public.vehicle_transaction_links vl
    where vl.vehicle_id = v.id and vl.role = 'compra'
  )
order by v.purchase_date;

-- ===========================================================================
-- DIAGNOSTICO — nao altera nada. Candidatos aos 4 custos do Hyundai ix35
-- ainda sem transaction_id confirmado (Marius Garage x2, Brendan Walsh
-- Tyres, Top Part Limited). Rodar antes de escrever o proximo vinculo.
-- ===========================================================================
select
  t.id as transaction_id,
  t.occurred_on,
  t.description,
  t.amount_cents / 100.0 as valor,
  a.name as conta,
  exists (
    select 1 from public.vehicle_transaction_links vl where vl.transaction_id = t.id
  ) as ja_vinculada
from public.transactions t
join public.accounts a on a.id = t.account_id
where t.type = 'despesa'
  and (
    public.normalize_description(t.description) like '%marius garage%'
    or public.normalize_description(t.description) like '%brendan walsh%'
    or public.normalize_description(t.description) like '%top part limited%'
  )
order by t.occurred_on;
