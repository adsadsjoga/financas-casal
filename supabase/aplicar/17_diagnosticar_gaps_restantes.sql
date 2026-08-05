-- DIAGNOSTICO — nao altera nada.
--
-- Consolida a busca de tudo que ainda esta sem vinculo depois de 08_, 09_,
-- 14_ e 15_: a compra do Qashqai 2011, as 5 compras dos carros antigos, e os
-- 2 custos "Sebastians Garage". Uma unica consulta, pra pegar os IDs frescos
-- no mesmo instante em que serao usados no proximo insert — os IDs colhidos
-- em rodadas anteriores desta sessao ficaram obsoletos entre a busca e o
-- uso (2 vezes ja), entao o insert final vai ser gerado a partir do
-- resultado desta consulta, nao de IDs antigos.

with alvo(veiculo, pessoa, valor_cents, data_ref) as (
  values
    ('Nissan Qashqai 2011',  'martin samaglo',              120000, date '2026-01-11'),
    ('Opel Corsa 2009',      'margaret pauline sutton',      130000, date '2025-02-09'),
    ('Ford Fiesta marrom',   'maria zoraida cano gonzalez',   55000, date '2025-06-01'),
    ('Renault Clio',         'darra o connell',              128000, date '2025-08-23'),
    ('Mitsubishi Swift',     'estefania torres esquivel',    120000, date '2025-09-24'),
    ('Mitsubishi Lancer',    'mindaugas paskevicius',        170000, date '2025-11-24'),
    ('Ford Focus (custo)',   'sebastians garage',             52766, date '2026-04-09'),
    ('Opel Corsa 2010 (custo)', 'sebastians garage',          47755, date '2026-06-14')
)
select
  a.veiculo,
  a.valor_cents / 100.0 as valor_esperado,
  t.id as transaction_id,
  t.occurred_on,
  t.description,
  t.amount_cents / 100.0 as valor_real,
  exists (
    select 1 from public.vehicle_transaction_links vl where vl.transaction_id = t.id
  ) as ja_vinculada
from alvo a
left join public.transactions t
  on t.type = 'despesa'
  and t.amount_cents = a.valor_cents
  and t.occurred_on between a.data_ref - 3 and a.data_ref + 3
  and public.normalize_description(t.description) like '%' || a.pessoa || '%'
order by a.data_ref;
