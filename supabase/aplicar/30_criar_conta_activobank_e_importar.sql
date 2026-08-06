-- Importação ActivoBank (Joana, EUR) — gerado por scripts/gerar_import_cgd_joana.py
-- 72 lançamentos.
--
-- Rodar INTEIRO de uma vez no SQL Editor do Supabase. Idempotente pra
-- 72 linhas com 'ID' da planilha (external_id). As 0 sem
-- ID (dividendos pequenos sem referência única) dependem só do fingerprint
-- automático do trigger — rodar este script duas vezes pode duplicá-las.
--
-- SEM saldo inicial confirmado por extrato (diferente do CGD) — a planilha
-- não traz reconciliação bancária pra esta conta. Saldo inicial = 0, mesma
-- decisão já tomada pro Nubank; ajustar depois manualmente em /contas.

begin;

-- 1. A conta. `accounts` não tem unique constraint em nome — `where not
--    exists` evita criar duas contas 'ActivoBank' se rodar duas vezes.
insert into public.accounts
  (couple_id, name, type, currency, owner_profile_id, initial_balance_cents, color)
select c.id, 'ActivoBank', 'banco', 'EUR', m.profile_id, 0, '#14b8a6'
from public.couples c
join public.couple_members m on m.couple_id = c.id
join public.profiles p on p.id = m.profile_id
where p.display_name ilike 'joana%'
  and not exists (
    select 1 from public.accounts a where a.couple_id = c.id and a.name = 'ActivoBank'
  );

-- 2. Categorias — todas já deveriam existir no app (nenhuma nova por
--    desenho). `on conflict do nothing` só como rede de segurança:
--    - Alimentação fora (despesa)
--    - Compras (despesa)
--    - Compras e Roupa (despesa)
--    - Empréstimos e Dívidas (despesa)
--    - Investimentos (despesa)
--    - Outras despesas (despesa)
--    - Outras receitas (receita)
--    - Rendimentos (receita)
--    - Saúde (despesa)
--    - Supermercado (despesa)
--    - Taxas bancárias (despesa)
--    - Transferências internas (despesa)
--    - Transferências internas (receita)
--    - Transporte (despesa)
insert into public.categories (couple_id, name, kind, icon)
select c.id, v.name, v.kind::public.category_kind, v.icon
from public.couples c, (values
  ('Alimentação fora', 'despesa', '📦'),
  ('Compras', 'despesa', '📦'),
  ('Compras e Roupa', 'despesa', '🛍️'),
  ('Empréstimos e Dívidas', 'despesa', '💳'),
  ('Investimentos', 'despesa', '📦'),
  ('Outras despesas', 'despesa', '📦'),
  ('Outras receitas', 'receita', '📦'),
  ('Rendimentos', 'receita', '📦'),
  ('Saúde', 'despesa', '📦'),
  ('Supermercado', 'despesa', '🛒'),
  ('Taxas bancárias', 'despesa', '🏦'),
  ('Transferências internas', 'despesa', '🔄'),
  ('Transferências internas', 'receita', '🔄'),
  ('Transporte', 'despesa', '📦')
) as v(name, kind, icon)
on conflict do nothing;

-- 3. Os lançamentos.
with conta as (
       select a.id, a.couple_id from public.accounts a
       join public.profiles p on p.id = a.owner_profile_id
       where p.display_name ilike 'joana%' and a.name = 'ActivoBank' limit 1
     ),
     autor as (
       select m.profile_id from public.couple_members m
       join public.profiles p on p.id = m.profile_id
       where p.display_name ilike 'joana%' limit 1
     )
insert into public.transactions
  (couple_id, account_id, category_id, created_by, payer_profile_id, type,
   amount_cents, rate_to_primary, description, occurred_on, external_id, needs_review)
select conta.couple_id, conta.id,
       (select cat.id from public.categories cat
         where cat.couple_id = conta.couple_id
           and cat.name = v.categoria
           and cat.kind = v.tipo::public.category_kind
         limit 1),
       autor.profile_id, autor.profile_id, v.tipo::public.tx_type,
       v.centavos, 1, v.descricao, v.data::date, v.external_id, v.revisar
from conta, autor, (values
  ('2026-01-23', 'receita', 50000, 'TRF. P/O Joana Palminha', 'ACT-20260123-001', 'Transferências internas', false),
  ('2026-01-23', 'receita', 200000, 'TRF. P/O Joana Palminha', 'ACT-20260123-002', 'Transferências internas', false),
  ('2026-01-23', 'receita', 200000, 'TRF. P/O Joana Palminha', 'ACT-20260123-003', 'Transferências internas', false),
  ('2026-01-23', 'receita', 200000, 'TRF. P/O Joana Palminha', 'ACT-20260123-004', 'Transferências internas', false),
  ('2026-01-23', 'receita', 300000, 'TRF. P/O Joana Palminha', 'ACT-20260123-005', 'Transferências internas', false),
  ('2026-01-23', 'despesa', 900000, 'CONSTIT DEPOSITO ESPECIAL AB 3533758598', 'ACT-20260123-006', 'Transferências internas', false),
  ('2026-01-27', 'despesa', 7099, 'COMPRA 9187 MGP Vinted Vilnius LT', 'ACT-20260127-007', 'Outras despesas', true),
  ('2026-01-27', 'despesa', 2383, 'COMPRA 9187 LIDL IRELAND LTD LIMERI CONTACTLESS', 'ACT-20260127-008', 'Supermercado', false),
  ('2026-01-27', 'despesa', 925, 'COMPRA 9187 PEPCO - 2696 LIMERICK I CONTACTLESS', 'ACT-20260127-009', 'Compras e Roupa', false),
  ('2026-01-27', 'despesa', 1277, 'COMPRA 9187 DUNNES CHILDERS ROAD LI CONTACTLESS', 'ACT-20260127-010', 'Supermercado', false),
  ('2026-01-30', 'despesa', 2400, 'COMPRA 9187 IRISH CITYLINK GALWAY IE', 'ACT-20260130-011', 'Transporte', false),
  ('2026-01-30', 'despesa', 1260, 'COMPRA 9187 SOUTHS BAR LIMERICK IE CONTACTLESS', 'ACT-20260130-012', 'Alimentação fora', false),
  ('2026-02-03', 'despesa', 430, 'COMPRA 9187 DEALZ - 1609 LIMERICK I CONTACTLESS', 'ACT-20260203-013', 'Compras e Roupa', false),
  ('2026-02-03', 'despesa', 7500, 'COMPRA 9187 PENNEYS LIMERICK-OCONNE CONTACTLESS', 'ACT-20260203-014', 'Compras e Roupa', false),
  ('2026-02-03', 'despesa', 1805, 'COMPRA 9187 TESCO STORES 3581 DOORA CONTACTLESS', 'ACT-20260203-015', 'Supermercado', false),
  ('2026-02-03', 'despesa', 599, 'COMPRA 9187 MR PRICE ROXBORO IE CONTACTLESS', 'ACT-20260203-016', 'Compras e Roupa', false),
  ('2026-02-03', 'despesa', 796, 'COMPRA 9187 MR PRICE ROXBORO IE CONTACTLESS', 'ACT-20260203-017', 'Compras e Roupa', false),
  ('2026-02-04', 'despesa', 1125, 'COMPRA 9187 GLORIA JEANS COFFEE LIM CONTACTLESS', 'ACT-20260204-018', 'Alimentação fora', false),
  ('2026-02-04', 'despesa', 350, 'COMPRA 9187 TIGER STORES V94TN83 IE CONTACTLESS', 'ACT-20260204-019', 'Compras e Roupa', false),
  ('2026-02-04', 'despesa', 650, 'COMPRA 9187 DEALZ - 1609 LIMERICK I CONTACTLESS', 'ACT-20260204-020', 'Compras e Roupa', false),
  ('2026-02-04', 'despesa', 75, 'COMPRA 9187 CEWE LIMITED LIMERICK I CONTACTLESS', 'ACT-20260204-021', 'Compras', false),
  ('2026-02-04', 'despesa', 3125, 'COMPRA 9187 PENNEYS LIMERICK-OCONNE CONTACTLESS', 'ACT-20260204-022', 'Compras e Roupa', false),
  ('2026-02-05', 'despesa', 1702, 'COMPRA 9187 LIDL IRELAND LTD LIMERI CONTACTLESS', 'ACT-20260205-023', 'Supermercado', false),
  ('2026-02-06', 'despesa', 5350, 'COMPRA 9187 CLINICA LUSIADAS 2685-1 CONTACTLESS', 'ACT-20260206-024', 'Saúde', false),
  ('2026-02-06', 'despesa', 3000, 'COMPRA 9187 WELLS AMADORA AMADORA P CONTACTLESS', 'ACT-20260206-025', 'Saúde', false),
  ('2026-02-06', 'despesa', 700, 'COMPRA 9187 FARMACIA CAVACA AMADORA CONTACTLESS', 'ACT-20260206-026', 'Saúde', false),
  ('2026-02-06', 'despesa', 3725, 'COMPRA 9187 FARMACIA CLABEL AMADORA CONTACTLESS', 'ACT-20260206-027', 'Saúde', false),
  ('2026-02-10', 'despesa', 1778, 'COMPRA 9187 CONTINENTE AMADORA AMAD CONTACTLESS', 'ACT-20260210-028', 'Supermercado', false),
  ('2026-03-02', 'receita', 8000, 'TRF. P/O SONIA MARIA FERREIRA COSTA', 'ACT-20260302-029', 'Outras receitas', true),
  ('2026-03-03', 'despesa', 1032, 'COMPRA 9187 TESCO STORES 3521 LIMER CONTACTLESS', 'ACT-20260303-030', 'Supermercado', false),
  ('2026-03-10', 'despesa', 750, 'COMPRA 9187 THE WORKS LIMERICK IE CONTACTLESS', 'ACT-20260310-031', 'Compras e Roupa', false),
  ('2026-03-10', 'despesa', 5436, 'COMPRA 9187 AMZN Mktp UK 6A1IP2SU5 AMAZON.CO.UK', 'ACT-20260310-032', 'Compras', false),
  ('2026-03-10', 'despesa', 209, 'CUSTO DE SERVICO INTERNACIONAL', 'ACT-20260310-033', 'Taxas bancárias', false),
  ('2026-03-10', 'despesa', 8, 'IMPOSTO DO SELO', 'ACT-20260310-034', 'Taxas bancárias', false),
  ('2026-03-18', 'receita', 3000, 'TRF. P/O Joana Palminha', 'ACT-20260318-035', 'Transferências internas', false),
  ('2026-03-24', 'despesa', 635, 'COMPRA 9187 TESCO STORES 6913 CO. D CONTACTLESS', 'ACT-20260324-036', 'Supermercado', false),
  ('2026-03-24', 'despesa', 270, 'COMPRA 9187 TESCO STORES 3559 DUBLI CONTACTLESS', 'ACT-20260324-037', 'Supermercado', false),
  ('2026-03-25', 'despesa', 3023, 'COMPRA 9187 AMAZON.IE LUXEMBOURG LU', 'ACT-20260325-038', 'Compras', false),
  ('2026-03-25', 'despesa', 495, 'COMPRA 9187 LIDL IRELAND LTD LIMERI CONTACTLESS', 'ACT-20260325-039', 'Supermercado', false),
  ('2026-03-25', 'despesa', 255, 'COMPRA 9187 SUPERVALU GARVEYS CORB CONTACTLESS', 'ACT-20260325-040', 'Supermercado', false),
  ('2026-03-30', 'receita', 2500, 'TRF. P/O Joana Palminha', 'ACT-20260330-041', 'Transferências internas', false),
  ('2026-03-31', 'despesa', 649, 'COMPRA 9187 TESCO STORES 3581 DOORA CONTACTLESS', 'ACT-20260331-042', 'Supermercado', false),
  ('2026-04-02', 'despesa', 697, 'COMPRA 9187 SUPERVALU GARVEYS CORB CONTACTLESS', 'ACT-20260402-043', 'Supermercado', false),
  ('2026-04-02', 'receita', 8000, 'TRF. P/O Joana Palminha', 'ACT-20260402-044', 'Transferências internas', false),
  ('2026-04-02', 'despesa', 8126, 'PAGSERV COFIDIS-C. FINANC POUR 20858/289868365', 'ACT-20260402-045', 'Empréstimos e Dívidas', true),
  ('2026-04-02', 'receita', 2800, 'TRF. P/O Joana Palminha', 'ACT-20260402-046', 'Transferências internas', false),
  ('2026-04-02', 'despesa', 4098, 'PAGSERV COFIDIS-C. FINANC POUR 20858/299098239', 'ACT-20260402-047', 'Empréstimos e Dívidas', true),
  ('2026-04-13', 'receita', 3600, 'TRF. P/O Joana Palminha', 'ACT-20260413-048', 'Transferências internas', false),
  ('2026-04-23', 'despesa', 970, 'COMPRA 9187 MLCLUS DUBLIN IE', 'ACT-20260423-049', 'Outras despesas', true),
  ('2026-04-23', 'despesa', 440, 'COMPRA 9187 DAYBREAK QUINLAN ST. LI CONTACTLESS', 'ACT-20260423-050', 'Supermercado', false),
  ('2026-04-23', 'receita', 3375, 'JUROS DEPOSITO A PRAZO', 'ACT-20260423-051', 'Rendimentos', false),
  ('2026-04-23', 'despesa', 945, 'IMPOSTO IRS/IRC DEPOSITO PRAZO 3533758598', 'ACT-20260423-052', 'Investimentos', false),
  ('2026-04-28', 'despesa', 1497, 'COMPRA 9187 MR PRICE ROXBORO IE CONTACTLESS', 'ACT-20260428-053', 'Compras e Roupa', false),
  ('2026-05-08', 'despesa', 660, 'COMPRA 9187 DAYBREAK QUINLAN ST. LI CONTACTLESS', 'ACT-20260508-054', 'Supermercado', false),
  ('2026-05-08', 'receita', 1000, 'TRF. P/O GABRIELA ALEXANDRA ROCHA DELGA', 'ACT-20260508-055', 'Outras receitas', true),
  ('2026-05-11', 'receita', 500, 'TRF. P/O Joana Palminha', 'ACT-20260511-056', 'Transferências internas', false),
  ('2026-05-12', 'despesa', 525, 'COMPRA 9187 TESCO STORES 3581 DOORA CONTACTLESS', 'ACT-20260512-057', 'Supermercado', false),
  ('2026-05-12', 'despesa', 642, 'COMPRA 9187 ALDI CO LIMERICK IE CONTACTLESS', 'ACT-20260512-058', 'Supermercado', false),
  ('2026-05-12', 'despesa', 2999, 'COMPRA 9187 SMYTHS TOYS LIMERICK P CONTACTLESS', 'ACT-20260512-059', 'Compras e Roupa', false),
  ('2026-05-28', 'receita', 3500, 'TRF. P/O SONIA MARIA FERREIRA COSTA', 'ACT-20260528-060', 'Outras receitas', true),
  ('2026-06-02', 'despesa', 2651, 'COMPRA 9187 MR PRICE ROXBORO IE CONTACTLESS', 'ACT-20260602-061', 'Compras e Roupa', false),
  ('2026-06-03', 'despesa', 1181, 'COMPRA 9187 ALDI CO LIMERICK IE CONTACTLESS', 'ACT-20260603-062', 'Supermercado', false),
  ('2026-06-09', 'receita', 6000, 'TRF. P/O SONIA MARIA FERREIRA COSTA', 'ACT-20260609-063', 'Outras receitas', true),
  ('2026-06-23', 'despesa', 3499, 'COMPRA 9187 CURRYS LIMERICK LIMERIC CONTACTLESS', 'ACT-20260623-064', 'Compras', false),
  ('2026-06-23', 'despesa', 1898, 'COMPRA 9187 MR PRICE ROXBORO IE CONTACTLESS', 'ACT-20260623-065', 'Compras e Roupa', false),
  ('2026-06-25', 'receita', 5000, 'TRF. P/O SONIA MARIA FERREIRA COSTA', 'ACT-20260625-066', 'Outras receitas', true),
  ('2026-07-01', 'receita', 10500, 'TRF. P/O JOANA FILIPA COSTA PALMINHA', 'ACT-20260701-067', 'Transferências internas', false),
  ('2026-07-02', 'despesa', 2850, 'PAGSERV COFIDIS-C. FINANC POUR 20858/299098239', 'ACT-20260702-068', 'Empréstimos e Dívidas', true),
  ('2026-07-02', 'despesa', 6877, 'PAGSERV COFIDIS-C. FINANC POUR 20858/289868365', 'ACT-20260702-069', 'Empréstimos e Dívidas', true),
  ('2026-07-14', 'despesa', 3989, 'COMPRA 9187 feelgoodcontacts.ie Gibraltar GI', 'ACT-20260714-070', 'Saúde', false),
  ('2026-07-22', 'receita', 1125, 'JUROS DEPOSITO A PRAZO', 'ACT-20260722-071', 'Rendimentos', false),
  ('2026-07-22', 'despesa', 315, 'IMPOSTO IRS/IRC DEPOSITO PRAZO 3533758598', 'ACT-20260722-072', 'Investimentos', false)
) as v(data, tipo, centavos, descricao, external_id, categoria, revisar)
on conflict (account_id, external_id) where external_id is not null do nothing;

commit;

-- Conferência depois de rodar:
-- select count(*) as lancamentos, count(*) filter (where needs_review) as revisar,
--        sum(case when t.type='receita' then t.amount_cents else -t.amount_cents end)/100.0
--          as variacao_liquida
-- from public.transactions t join public.accounts a on a.id = t.account_id
-- where a.name = 'ActivoBank';
