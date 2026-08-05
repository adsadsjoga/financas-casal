-- ALTERA DADOS. Idempotente (ON CONFLICT DO NOTHING). Mesmo padrao seguro do
-- 14_: so linka par cujo transaction_id existe agora (inner join), nunca
-- insert cego que poderia abortar tudo por FK.
--
-- Os 4 custos do Hyundai ix35 achados pelo diagnostico do 14_, batendo exato
-- com docs/carros.md (Peças 580,00 · 27/03, Trabalho 452,40 · 08/04, Pneu
-- 120,00 · 11/04, Bateria 150,00 · 02/05 — soma 1.302,40, o total ja
-- documentado). Os outros 3 candidatos "Top Part Limited" do diagnostico
-- (12,00; 3,00; 15,00) NAO entram: nenhum bate valor+data, e o de 15,00 em
-- 27/05 ja estava marcado em ETAPA_ATUAL_CONCILIACAO.md como "nao vincular
-- sem confirmacao".

begin;

insert into public.vehicle_transaction_links (couple_id, vehicle_id, transaction_id, role)
select v.couple_id, v.id, t.id, 'custo'
from public.vehicles v
join (values
  ('a71f86c9-a074-4392-be75-705353795a22'::uuid), -- Peças, 580,00, 2026-03-27
  ('93ec1ed4-522e-4d64-8624-31ffadbd0543'::uuid), -- Trabalho, 452,40, 2026-04-08
  ('8f9224f2-58b0-4062-b8b2-c710775ed12c'::uuid), -- Pneu, 120,00, 2026-04-11
  ('9df390c1-08ad-499f-a19f-e04a8bebcc1d'::uuid)  -- Bateria, 150,00, 2026-05-02
) as x(transaction_id) on true
join public.transactions t on t.id = x.transaction_id
where public.normalize_description(v.make || ' ' || v.model) = 'hyundai ix35'
on conflict (vehicle_id, transaction_id, role) do nothing;

update public.transactions t
set category_id = c.id, needs_review = false
from public.categories c, public.vehicle_transaction_links vl
where vl.transaction_id = t.id
  and vl.role = 'custo'
  and t.id in (
    'a71f86c9-a074-4392-be75-705353795a22',
    '93ec1ed4-522e-4d64-8624-31ffadbd0543',
    '8f9224f2-58b0-4062-b8b2-c710775ed12c',
    '9df390c1-08ad-499f-a19f-e04a8bebcc1d'
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
-- 1. Os 4 custos do ix35 tem que aparecer, somando 1.302,40.
select
  t.description,
  t.amount_cents / 100.0 as valor,
  t.occurred_on,
  cat.name as categoria_apos
from public.vehicle_transaction_links vl
join public.transactions t on t.id = vl.transaction_id
left join public.categories cat on cat.id = t.category_id
where vl.transaction_id in (
  'a71f86c9-a074-4392-be75-705353795a22',
  '93ec1ed4-522e-4d64-8624-31ffadbd0543',
  '8f9224f2-58b0-4062-b8b2-c710775ed12c',
  '9df390c1-08ad-499f-a19f-e04a8bebcc1d'
)
order by t.occurred_on;

-- 2. Resumo final do Hyundai ix35 2012 — esperado, pela planilha:
--    compra 3.100,00 | custos 1.302,40 | venda 4.700,00 | lucro 297,60
-- Cada agregado calculado em subquery propria (lateral) — dois `left join`
-- direto pra tabelas sem relacao entre si (vehicle_costs e
-- vehicle_transaction_links) multiplicaria linhas e infla os totais.
select
  v.make || ' ' || v.model || coalesce(' ' || v.year, '') as veiculo,
  v.purchase_price_cents / 100.0 as compra,
  coalesce(custos.total, 0) / 100.0 as custos_cadastrados,
  coalesce(links.qtd, 0) as custos_vinculados,
  v.sale_price_cents / 100.0 as venda,
  (v.sale_price_cents - v.purchase_price_cents - coalesce(custos.total, 0)) / 100.0 as lucro
from public.vehicles v
left join lateral (
  select sum(vc.amount_cents) as total from public.vehicle_costs vc where vc.vehicle_id = v.id
) custos on true
left join lateral (
  select count(*) as qtd from public.vehicle_transaction_links vl
  where vl.vehicle_id = v.id and vl.role = 'custo'
) links on true
where public.normalize_description(v.make || ' ' || v.model) = 'hyundai ix35';
