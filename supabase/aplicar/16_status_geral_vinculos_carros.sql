-- DIAGNOSTICO — nao altera nada.
--
-- Status consolidado dos 14 veiculos apos 08_, 09_, 11_, 14_ e 15_. Uma
-- consulta so, pra fechar de vez o que ainda falta em vez de conferir aos
-- poucos.
--
-- Esperado pela conciliacao com o Excel (planilha 2026-08-05):
--
--   Veiculo               compra   custo cadastrado   compra vinculada?
--   Nissan Qashqai 2010    1500        67,85           sim (Jamie Slater)
--   Ford Ka 2010           1600       116,34            sim (Thomas Enright)
--   Ford Focus 2010         700       634,71            sim (Geraldine Mullane)
--   Hyundai ix35 2012      3100      1302,40            sim (Kamelia Khalfi)
--   Nissan Qashqai 2011    1200       211,53            sim (Martin Samaglo, do 09_)
--   Opel Corsa 2010        1050       549,69            NAO (extrato nao tem — dinheiro)
--
--   Ford Fiesta marrom       550         0              sim (do 09_)
--   Mitsubishi Lancer       1700         0              sim (do 09_)
--   Opel Corsa 2009         1300        50              sim (do 09_)
--   Renault Clio            1280       300              sim (do 09_)
--   Mitsubishi Swift        1200         0              sim (do 09_)
--   VW Polo azul             900         0              NAO (saida em dinheiro)
--   Renault Fluence         1200         0              NAO (saida em dinheiro)
--   Ford Fiesta vermelho     950         0              NAO (saida do cofre, nao do banco)

select
  v.make || ' ' || v.model || coalesce(' ' || v.year, '') as veiculo,
  v.status,
  v.purchase_price_cents / 100.0 as compra,
  coalesce(custos.total, 0) / 100.0 as custo_cadastrado,
  coalesce(links.compras, 0) as compras_vinculadas,
  coalesce(links.custos, 0) as custos_vinculados,
  v.sale_price_cents / 100.0 as venda,
  case when v.sale_price_cents is not null then
    (v.sale_price_cents - v.purchase_price_cents - coalesce(custos.total, 0)) / 100.0
  end as lucro
from public.vehicles v
left join lateral (
  select sum(vc.amount_cents) as total from public.vehicle_costs vc where vc.vehicle_id = v.id
) custos on true
left join lateral (
  select
    count(*) filter (where vl.role = 'compra') as compras,
    count(*) filter (where vl.role = 'custo') as custos
  from public.vehicle_transaction_links vl where vl.vehicle_id = v.id
) links on true
order by v.purchase_date;

-- Total geral dos 6 carros atuais (excluindo os 8 antigos) — esperado pelo
-- Excel: compras 9.150,00 | custos 2.882,52 | vendas 19.250,00 | lucro 7.217,48
select
  sum(v.purchase_price_cents) / 100.0 as compras,
  sum(coalesce(custos.total, 0)) / 100.0 as custos,
  sum(v.sale_price_cents) / 100.0 as vendas,
  sum(v.sale_price_cents - v.purchase_price_cents - coalesce(custos.total, 0)) / 100.0 as lucro
from public.vehicles v
left join lateral (
  select sum(vc.amount_cents) as total from public.vehicle_costs vc where vc.vehicle_id = v.id
) custos on true
where v.notes not like 'Carro antigo,%';
