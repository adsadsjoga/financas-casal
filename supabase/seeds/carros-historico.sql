-- =============================================================================
-- Carrega o histórico real de 6 carros (Auto Tally) no módulo de veículos.
-- Ver docs/carros.md para a conciliação completa e as fontes de cada dado.
--
-- Confiança das datas:
--   * Compra de Focus, Qashqai 2010, Ka e Honda IX35: ACHADAS no extrato
--     Revolut (transferência real, mesmo valor).
--   * Venda de Qashqai 2010, Ka, Focus, Qashqai 2011 e IX35: o mês de cada
--     venda foi confirmado batendo o "lucro por mês" contra o lucro de cada
--     carro — é a ÚNICA combinação que fecha os 5 meses informados, então a
--     atribuição carro→mês está matematicamente garantida. O DIA dentro do
--     mês vem da primeira transferência do comprador correspondente.
--   * Compra do Opel Corsa e do Nissan Qashqai 2011: NÃO encontradas no
--     extrato — provavelmente pagas em dinheiro. Datas ESTIMADAS, marcadas
--     nas notes de cada veículo. Ajuste se souber a data certa.
--
-- Rode inteiro no SQL Editor do Supabase. Roda uma vez só — se detectar que
-- já foi aplicado, aborta sem inserir nada de novo.
-- =============================================================================

do $$
declare
  v_couple     uuid;
  v_count      int;
  v_corsa      uuid;
  v_qashqai11  uuid;
  v_focus      uuid;
  v_qashqai10  uuid;
  v_ka         uuid;
  v_ix35       uuid;
begin
  select count(*) into v_count from public.couples;
  if v_count <> 1 then
    raise exception 'Esperava exatamente 1 casal cadastrado, encontrei %. Edite este script e fixe v_couple manualmente antes de rodar.', v_count;
  end if;
  select id into v_couple from public.couples limit 1;

  if exists (
    select 1 from public.vehicles
    where couple_id = v_couple and make = 'Opel' and model = 'Corsa' and purchase_price_cents = 105000
  ) then
    raise exception 'Este seed já parece ter sido aplicado (achei o Opel Corsa 2010). Nada foi inserido — apague o registro manualmente se quiser recarregar.';
  end if;

  -- 1) Opel Corsa 2010 — vendido à vista em julho
  insert into public.vehicles
    (couple_id, status, make, model, year, purchase_price_cents, purchase_date, sale_price_cents, sale_date, buyer_name, notes)
  values
    (v_couple, 'vendido', 'Opel', 'Corsa', 2010, 105000, '2026-04-15', 200000, '2026-07-20', '',
     'Venda à vista em 20/07. Data de compra ESTIMADA — não encontrada no extrato Revolut, provavelmente paga em dinheiro. Ajuste se souber a data certa.')
  returning id into v_corsa;

  insert into public.vehicle_costs (couple_id, vehicle_id, category, description, amount_cents, occurred_on) values
    (v_couple, v_corsa, 'Mecânica', 'Peças', 4160, '2026-05-26'),
    (v_couple, v_corsa, 'Mecânica', 'Mecânico', 47700, '2026-06-13');

  -- 2) Nissan Qashqai 2011 — Danilo, parcelado
  insert into public.vehicles
    (couple_id, status, make, model, year, purchase_price_cents, purchase_date, sale_price_cents, sale_date, buyer_name, notes)
  values
    (v_couple, 'vendido', 'Nissan', 'Qashqai', 2011, 135000, '2026-03-15', 340000, '2026-05-17', 'Danilo Rocha da Silva',
     'Entrada de 1.000 + 12x 200. 11 parcelas já recebidas; falta a 12ª (200), vencendo 08/08/2026. Data de compra ESTIMADA — não encontrada no extrato.')
  returning id into v_qashqai11;

  insert into public.vehicle_costs (couple_id, vehicle_id, category, description, amount_cents, occurred_on) values
    (v_couple, v_qashqai11, 'Outro', 'Lavajato', 1200, '2026-04-27'),
    (v_couple, v_qashqai11, 'Outro', 'Volta de Waterford', 5274, '2026-05-17');

  insert into public.vehicle_sale_installments (couple_id, vehicle_id, installment_no, due_on, amount_cents, paid_on) values
    (v_couple, v_qashqai11, 12, '2026-08-08', 20000, null);

  -- 3) Ford Focus 2010 — Irene, à vista
  insert into public.vehicles
    (couple_id, status, make, model, year, purchase_price_cents, purchase_date, sale_price_cents, sale_date, buyer_name, notes)
  values
    (v_couple, 'vendido', 'Ford', 'Focus', 2010, 70000, '2026-03-14', 290000, '2026-04-09', 'Irene Benitez Suarez',
     'Pago à vista em transferência única — achada no extrato (09/04, valor exato).')
  returning id into v_focus;

  insert into public.vehicle_costs (couple_id, vehicle_id, category, description, amount_cents, occurred_on) values
    (v_couple, v_focus, 'Mecânica', 'Carro', 59266, '2026-03-20');

  -- 4) Nissan Qashqai 2010 — Cris, 9 parcelas
  insert into public.vehicles
    (couple_id, status, make, model, year, purchase_price_cents, purchase_date, sale_price_cents, sale_date, buyer_name, notes)
  values
    (v_couple, 'vendido', 'Nissan', 'Qashqai', 2010, 150000, '2026-02-01', 335000, '2026-02-04', 'Cristiane Alves Gonçalves',
     'Vendido em 9 parcelas, todas recebidas.')
  returning id into v_qashqai10;

  -- 5) Ford Ka 2010 — Kelly, 12 parcelas
  insert into public.vehicles
    (couple_id, status, make, model, year, purchase_price_cents, purchase_date, sale_price_cents, sale_date, buyer_name, notes)
  values
    (v_couple, 'vendido', 'Ford', 'Ka', 2010, 160000, '2026-03-07', 290000, '2026-03-20', 'Kelly Cristina Dias Pereira',
     'Vendido em 12 parcelas, todas recebidas.')
  returning id into v_ka;

  -- 6) Honda IX35 2012 — Pablo, 10 parcelas
  insert into public.vehicles
    (couple_id, status, make, model, year, purchase_price_cents, purchase_date, sale_price_cents, sale_date, buyer_name, notes)
  values
    (v_couple, 'vendido', 'Honda', 'IX35', 2012, 310000, '2026-03-22', 470000, '2026-05-11', 'Pablo Nogueira Costa Oliveira',
     'Vendido em 10 parcelas, todas recebidas.')
  returning id into v_ix35;

  insert into public.vehicle_costs (couple_id, vehicle_id, category, description, amount_cents, occurred_on) values
    (v_couple, v_ix35, 'Mecânica', 'Peças', 58000, '2026-04-03'),
    (v_couple, v_ix35, 'Mecânica', 'Trabalho', 45240, '2026-04-05'),
    (v_couple, v_ix35, 'Mecânica', 'Pneu', 12000, '2026-04-10'),
    (v_couple, v_ix35, 'Outro', 'Bateria', 15000, '2026-05-02');

  raise notice 'Seed aplicado: 6 veículos, 9 custos, 1 parcela pendente.';
end $$;

-- Conferência — deve mostrar os 6 carros com lucro batendo o histórico:
-- Corsa 431,40 · Qashqai11 1.985,26 · Focus 1.607,34 · Qashqai10 1.850,00 ·
-- Ka 1.300,00 · IX35 297,60 — soma 7.471,60.
select
  make, model, year,
  purchase_price_cents / 100.0 as compra,
  (select coalesce(sum(amount_cents), 0) from public.vehicle_costs c where c.vehicle_id = v.id) / 100.0 as custos,
  sale_price_cents / 100.0 as venda,
  (sale_price_cents - purchase_price_cents
    - (select coalesce(sum(amount_cents), 0) from public.vehicle_costs c where c.vehicle_id = v.id)) / 100.0 as lucro,
  buyer_name, sale_date
from public.vehicles v
order by sale_date;
