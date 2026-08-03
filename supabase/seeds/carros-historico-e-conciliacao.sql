-- =============================================================================
-- Seed + conciliacao dos 6 carros reais do Gabriel.
-- Rode no SQL Editor do Supabase. Seguro para rodar mais de uma vez:
-- - se os carros ja existem, reutiliza os registros;
-- - custos e parcela pendente usam ON CONFLICT/NOT EXISTS;
-- - vinculos usam ON CONFLICT para nao duplicar.
-- =============================================================================

do $$
declare
  v_couple uuid;
  v_count int;
  v_corsa uuid;
  v_qashqai11 uuid;
  v_focus uuid;
  v_qashqai10 uuid;
  v_ka uuid;
  v_ix35 uuid;
begin
  select count(*) into v_count from public.couples;
  if v_count <> 1 then
    raise exception 'Esperava exatamente 1 casal cadastrado, encontrei %.', v_count;
  end if;
  select id into v_couple from public.couples limit 1;

  insert into public.vehicles (couple_id, status, make, model, year, purchase_price_cents, purchase_date, sale_price_cents, sale_date, buyer_name, notes)
  values (v_couple, 'vendido', 'Opel', 'Corsa', 2010, 105000, '2026-04-15', 200000, '2026-07-20', '', 'Vendido a vista em 20/07. Compra provavelmente em dinheiro; data estimada.')
  on conflict do nothing;
  select id into v_corsa from public.vehicles where couple_id = v_couple and make = 'Opel' and model = 'Corsa' and year = 2010 and purchase_price_cents = 105000 limit 1;

  insert into public.vehicles (couple_id, status, make, model, year, purchase_price_cents, purchase_date, sale_price_cents, sale_date, buyer_name, notes)
  values (v_couple, 'vendido', 'Nissan', 'Qashqai', 2011, 135000, '2026-03-15', 340000, '2026-05-17', 'Danilo Rocha da Silva', 'Entrada de 1.000 + 12x200. Recebido 3.200; falta 200 da parcela 12/12, vencendo 08/08/2026. Compra provavelmente em dinheiro; data estimada.')
  on conflict do nothing;
  select id into v_qashqai11 from public.vehicles where couple_id = v_couple and make = 'Nissan' and model = 'Qashqai' and year = 2011 and purchase_price_cents = 135000 limit 1;

  insert into public.vehicles (couple_id, status, make, model, year, purchase_price_cents, purchase_date, sale_price_cents, sale_date, buyer_name, notes)
  values (v_couple, 'vendido', 'Ford', 'Focus', 2010, 70000, '2026-03-14', 290000, '2026-04-09', 'Irene Benitez Suarez', 'Pago a vista por transferencia unica.')
  on conflict do nothing;
  select id into v_focus from public.vehicles where couple_id = v_couple and make = 'Ford' and model = 'Focus' and year = 2010 and purchase_price_cents = 70000 limit 1;

  insert into public.vehicles (couple_id, status, make, model, year, purchase_price_cents, purchase_date, sale_price_cents, sale_date, buyer_name, notes)
  values (v_couple, 'vendido', 'Nissan', 'Qashqai', 2010, 150000, '2026-02-01', 335000, '2026-02-04', 'Cristiane Alves Goncalves', 'Quitado em 9 parcelas.')
  on conflict do nothing;
  select id into v_qashqai10 from public.vehicles where couple_id = v_couple and make = 'Nissan' and model = 'Qashqai' and year = 2010 and purchase_price_cents = 150000 limit 1;

  insert into public.vehicles (couple_id, status, make, model, year, purchase_price_cents, purchase_date, sale_price_cents, sale_date, buyer_name, notes)
  values (v_couple, 'vendido', 'Ford', 'Ka', 2010, 160000, '2026-03-07', 290000, '2026-03-20', 'Kelly Cristina Dias Pereira', 'Quitado em 12 parcelas.')
  on conflict do nothing;
  select id into v_ka from public.vehicles where couple_id = v_couple and make = 'Ford' and model = 'Ka' and year = 2010 and purchase_price_cents = 160000 limit 1;

  insert into public.vehicles (couple_id, status, make, model, year, purchase_price_cents, purchase_date, sale_price_cents, sale_date, buyer_name, notes)
  values (v_couple, 'vendido', 'Honda', 'IX35', 2012, 310000, '2026-03-22', 470000, '2026-05-11', 'Pablo Nogueira Costa Oliveira', 'Quitado em 10 parcelas.')
  on conflict do nothing;
  select id into v_ix35 from public.vehicles where couple_id = v_couple and make = 'Honda' and model = 'IX35' and year = 2012 and purchase_price_cents = 310000 limit 1;

  insert into public.vehicle_costs (couple_id, vehicle_id, category, description, amount_cents, occurred_on)
  select * from (values
    (v_couple, v_ix35, 'Mecanica', 'Pecas', 58000::bigint, '2026-04-03'::date),
    (v_couple, v_ix35, 'Mecanica', 'Trabalho', 45240::bigint, '2026-04-05'::date),
    (v_couple, v_ix35, 'Mecanica', 'Pneu', 12000::bigint, '2026-04-10'::date),
    (v_couple, v_ix35, 'Outro', 'Bateria', 15000::bigint, '2026-05-02'::date),
    (v_couple, v_focus, 'Mecanica', 'Carro', 59266::bigint, '2026-03-20'::date),
    (v_couple, v_corsa, 'Mecanica', 'Pecas', 4160::bigint, '2026-05-26'::date),
    (v_couple, v_corsa, 'Mecanica', 'Mecanico', 47700::bigint, '2026-06-13'::date),
    (v_couple, v_qashqai11, 'Outro', 'Lavajato', 1200::bigint, '2026-04-27'::date),
    (v_couple, v_qashqai11, 'Outro', 'Volta de Waterford', 5274::bigint, '2026-05-17'::date)
  ) as c(couple_id, vehicle_id, category, description, amount_cents, occurred_on)
  where not exists (
    select 1 from public.vehicle_costs vc
    where vc.vehicle_id = c.vehicle_id and vc.amount_cents = c.amount_cents and vc.occurred_on = c.occurred_on and vc.description = c.description
  );

  insert into public.vehicle_sale_installments (couple_id, vehicle_id, installment_no, due_on, amount_cents, paid_on)
  values (v_couple, v_qashqai11, 12, '2026-08-08', 20000, null)
  on conflict (vehicle_id, installment_no) do nothing;

  insert into public.vehicle_transaction_links (couple_id, vehicle_id, transaction_id, role)
  select v_couple, v_qashqai11, t.id, 'parcela'
  from public.transactions t
  where t.couple_id = v_couple and t.type = 'receita' and t.description = 'Transfer from DANILO ROCHA DA SILVA'
  on conflict (vehicle_id, transaction_id, role) do nothing;

  insert into public.vehicle_transaction_links (couple_id, vehicle_id, transaction_id, role)
  select v_couple, v_focus, t.id, 'entrada'
  from public.transactions t
  where t.couple_id = v_couple and t.type = 'receita' and t.description = 'Transfer from IRENE BENITEZ SUAREZ'
  on conflict (vehicle_id, transaction_id, role) do nothing;

  insert into public.vehicle_transaction_links (couple_id, vehicle_id, transaction_id, role)
  select v_couple, v_qashqai10, t.id, 'parcela'
  from public.transactions t
  where t.couple_id = v_couple and t.type = 'receita' and t.description = 'Payment from CRISTIANE ALVES GONCALVES'
  on conflict (vehicle_id, transaction_id, role) do nothing;

  insert into public.vehicle_transaction_links (couple_id, vehicle_id, transaction_id, role)
  select v_couple, v_ka, t.id, 'parcela'
  from public.transactions t
  where t.couple_id = v_couple and t.type = 'receita' and t.description = 'Transfer from KELLY CRISTINA DIAS PEREIRA'
  on conflict (vehicle_id, transaction_id, role) do nothing;

  insert into public.vehicle_transaction_links (couple_id, vehicle_id, transaction_id, role)
  select v_couple, v_ix35, t.id, 'parcela'
  from public.transactions t
  where t.couple_id = v_couple and t.type = 'receita' and t.description = 'Transfer from PABLO NOGUEIRA COSTA OLIVEIRA'
  on conflict (vehicle_id, transaction_id, role) do nothing;
end $$;

select
  count(*) filter (where status = 'vendido') as vendidos,
  count(*) filter (where status = 'estoque') as estoque,
  sum(purchase_price_cents) / 100.0 as compras,
  (select sum(amount_cents) from public.vehicle_costs) / 100.0 as custos,
  sum(sale_price_cents) / 100.0 as vendas,
  (sum(sale_price_cents) - sum(purchase_price_cents) - (select sum(amount_cents) from public.vehicle_costs)) / 100.0 as lucro,
  (select coalesce(sum(amount_cents), 0) from public.vehicle_sale_installments where paid_on is null) / 100.0 as a_receber,
  (select count(*) from public.vehicle_transaction_links) as vinculos
from public.vehicles;
