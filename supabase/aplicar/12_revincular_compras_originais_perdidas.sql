-- ALTERA DADOS. Idempotente (NOT EXISTS/ON CONFLICT).
--
-- PROBLEMA (achado por acidente na conferencia do 09_, nao causado por ele)
-- `vehicle_transaction_links.transaction_id` tem ON DELETE CASCADE. Quando
-- `subir_revolut_gabriel_reconstrucao.sql` apagou as transacoes antigas de
-- Revolut/Revolut Poupanca do Gabriel para reimportar do extrato oficial
-- (2026-08-03), isso apagou TODOS os vinculos que apontavam para elas —
-- inclusive os 4 vinculos de COMPRA feitos em 02/08 pelo seed original
-- (`carros-historico-e-conciliacao.sql`), documentados em docs/carros.md:
--
--   Nissan Qashqai 2010  -> Transfer to JAMIE SLATER            1500  2026-02-01
--   Ford Ka 2010         -> Transfer to THOMAS PATRICK ENRIGHT  1600  2026-03-07
--   Ford Focus 2010      -> Transfer to GERALDINE MARY MULLANE   700  2026-03-14
--   Hyundai ix35 2012    -> Transfer to KAMELIA KHALFI          3100  2026-03-22
--
-- `docs/estado-atual.md` registra que o script de reconstrucao recriou os
-- vinculos dos 5 COMPRADORES (Danilo, Irene, Cristiane, Kelly, Pablo — lado
-- receita) por match de descricao, mas nao menciona recriar estes 4 do lado
-- vendedor (compra). A consulta 3 de 09_carros_conciliacao_xlsx.sql confirma:
-- os 4 aparecem sem vinculo de compra, com o mesmo valor e a mesma data que
-- ja estavam documentados.
--
-- Este script relaciona de novo, e reclassifica a categoria para 'Carro' —
-- mesmo padrao do 09_. Tambem relinca os 4 custos do Hyundai ix35 (Marius
-- Garage x2, Brendan Walsh Tyres, Top Part Limited), que tem a mesma causa
-- e ja tinham data e valor documentados com confianca.
--
-- NAO INCLUI os custos "Sebastians Garage" (Opel Corsa 477,55 e Ford Focus
-- 527,66) — a data exata desses dois nao ficou registrada em nenhum
-- documento lido nesta sessao. Ficam so no diagnostico no fim do arquivo.

begin;

with alvo as (
  select
    v.id as vehicle_id,
    v.couple_id,
    d.valor_cents,
    d.data_ref,
    d.vendedor
  from public.vehicles v
  join (values
    ('Nissan',  'Qashqai', 150000, date '2026-02-01', 'jamie slater'),
    ('Ford',    'Ka',      160000, date '2026-03-07', 'thomas patrick enright'),
    ('Ford',    'Focus',    70000, date '2026-03-14', 'geraldine mary mullane'),
    ('Hyundai', 'ix35',    310000, date '2026-03-22', 'kamelia khalfi')
  ) as d(make, model, valor_cents, data_ref, vendedor)
    on public.normalize_description(v.make) = public.normalize_description(d.make)
   and public.normalize_description(v.model) = public.normalize_description(d.model)
   and v.purchase_price_cents = d.valor_cents
),
casadas as (
  select distinct on (a.vehicle_id)
    a.vehicle_id, a.couple_id, t.id as transaction_id
  from alvo a
  join public.transactions t
    on t.couple_id = a.couple_id
   and t.type = 'despesa'
   and t.amount_cents = a.valor_cents
   and t.occurred_on between a.data_ref - 3 and a.data_ref + 3
   and public.normalize_description(t.description) like '%' || a.vendedor || '%'
  order by a.vehicle_id, t.occurred_on
)
insert into public.vehicle_transaction_links (couple_id, vehicle_id, transaction_id, role)
select couple_id, vehicle_id, transaction_id, 'compra'
from casadas
on conflict (vehicle_id, transaction_id, role) do nothing;

-- Custos do Hyundai ix35 achados no extrato original (docs/carros.md).
with alvo as (
  select v.id as vehicle_id, v.couple_id, d.categoria, d.valor_cents, d.data_ref, d.fornecedor
  from public.vehicles v
  join (values
    ('Pneu',    12000, date '2026-04-11', 'brendan walsh tyres'),
    ('Outro',   15000, date '2026-05-02', 'top part limited'),
    ('Peças',   58000, date '2026-03-27', 'marius garage'),
    ('Trabalho',45240, date '2026-04-08', 'marius garage')
  ) as d(categoria, valor_cents, data_ref, fornecedor) on true
  where public.normalize_description(v.make || ' ' || v.model) = 'hyundai ix35'
),
casadas as (
  select distinct on (a.categoria, a.valor_cents)
    a.vehicle_id, a.couple_id, t.id as transaction_id
  from alvo a
  join public.transactions t
    on t.couple_id = a.couple_id
   and t.type = 'despesa'
   and t.amount_cents = a.valor_cents
   and t.occurred_on between a.data_ref - 3 and a.data_ref + 3
   and public.normalize_description(t.description) like '%' || a.fornecedor || '%'
  order by a.categoria, a.valor_cents, t.occurred_on
)
insert into public.vehicle_transaction_links (couple_id, vehicle_id, transaction_id, role)
select couple_id, vehicle_id, transaction_id, 'custo'
from casadas
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
-- 1. Os 4 carros tem que aparecer aqui agora (antes nao apareciam).
select
  v.make || ' ' || v.model || coalesce(' ' || v.year, '') as veiculo,
  vl.role,
  t.description,
  t.amount_cents / 100.0 as valor,
  t.occurred_on
from public.vehicle_transaction_links vl
join public.vehicles v on v.id = vl.vehicle_id
join public.transactions t on t.id = vl.transaction_id
where public.normalize_description(v.make) in ('nissan', 'ford', 'hyundai')
  and v.purchase_price_cents in (150000, 160000, 70000, 310000)
order by t.occurred_on;

-- 2. O que ainda ficou sem vinculo de compra — esperado agora: so os 3 carros
--    antigos sem match (Polo, Fluence, Fiesta vermelho) e o Opel Corsa 2010.
select
  v.make || ' ' || v.model || coalesce(' ' || v.year, '') as veiculo,
  v.purchase_price_cents / 100.0 as compra,
  v.purchase_date
from public.vehicles v
where not exists (
  select 1 from public.vehicle_transaction_links vl
  where vl.vehicle_id = v.id and vl.role = 'compra'
)
order by v.purchase_date;

-- ===========================================================================
-- DIAGNOSTICO — nao altera nada. Candidatos para os 2 custos "Sebastians
-- Garage" (Opel Corsa 477,55 e Ford Focus 527,66) que ficaram de fora acima
-- por falta de data exata registrada. Conferir antes de vincular a mao.
-- ===========================================================================
select
  t.id as transaction_id,
  t.occurred_on,
  t.description,
  t.amount_cents / 100.0 as valor,
  exists (select 1 from public.vehicle_transaction_links vl where vl.transaction_id = t.id) as ja_vinculada
from public.transactions t
where t.type = 'despesa'
  and public.normalize_description(t.description) like '%sebastian%garage%'
order by t.occurred_on;
