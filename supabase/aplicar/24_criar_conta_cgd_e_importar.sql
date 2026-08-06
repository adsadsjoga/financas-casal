-- Importação CGD (Joana, EUR) — gerado por scripts/gerar_import_cgd_joana.py
-- 96 lançamentos, saldo inicial 187.38 € em 2025-07-01.
--
-- Rodar INTEIRO de uma vez no SQL Editor do Supabase, depois de conferir
-- 23_diagnosticar_joana_cgd.sql. Idempotente: a dedup usa o 'ID CGD' da
-- planilha (JCGD-AAAAMM-NNNN) como external_id.

begin;

-- 1. A conta. Saldo inicial vem do PDF do extrato (aba 'Extratos CGD'),
--    187.38 € em 2025-07-01 — os 12 meses da aba encadeiam
--    sem quebra e todos vêm 'Confirmado por PDF', não é estimativa.
--
--    `accounts` não tem unique constraint em nome — `where not exists` evita
--    criar duas contas 'CGD' se este script rodar duas vezes.
insert into public.accounts
  (couple_id, name, type, currency, owner_profile_id, initial_balance_cents, color)
select c.id, 'CGD', 'banco', 'EUR', m.profile_id, 18738, '#06b6d4'
from public.couples c
join public.couple_members m on m.couple_id = c.id
join public.profiles p on p.id = m.profile_id
where p.display_name ilike 'joana%'
  and not exists (
    select 1 from public.accounts a where a.couple_id = c.id and a.name = 'CGD'
  );

-- 2. Categorias que o import usa, caso ainda não existam. CONFERIR contra o
--    resultado do passo 4 de 23_diagnosticar_joana_cgd.sql antes de rodar —
--    pode já existir uma parecida com nome diferente (mesmo risco que motivou
--    08_unificar_categorias_duplicadas.sql):
--    - Assinaturas e Digital (despesa)
--    - Compras e Roupa (despesa)
--    - Empréstimos e Dívidas (despesa)
--    - Outros (despesa)
--    - Pagamentos a pessoas (despesa)
--    - Recebimentos de pessoas (receita)
--    - Supermercado (despesa)
--    - Taxas bancárias (despesa)
--    - Transferências internas (despesa)
--    - Transferências internas (receita)
insert into public.categories (couple_id, name, kind, icon)
select c.id, v.name, v.kind::public.category_kind, v.icon
from public.couples c, (values
  ('Assinaturas e Digital', 'despesa', '📺'),
  ('Compras e Roupa', 'despesa', '🛍️'),
  ('Empréstimos e Dívidas', 'despesa', '💳'),
  ('Outros', 'despesa', '📦'),
  ('Pagamentos a pessoas', 'despesa', '🤝'),
  ('Recebimentos de pessoas', 'receita', '🤝'),
  ('Supermercado', 'despesa', '🛒'),
  ('Taxas bancárias', 'despesa', '🏦'),
  ('Transferências internas', 'despesa', '🔄'),
  ('Transferências internas', 'receita', '🔄')
) as v(name, kind, icon)
on conflict do nothing;

-- 3. Os lançamentos.
with conta as (
       select a.id, a.couple_id from public.accounts a
       join public.profiles p on p.id = a.owner_profile_id
       where p.display_name ilike 'joana%' and a.name = 'CGD' limit 1
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
  ('2025-07-01', 'despesa', 6877, 'COFIDIS', 'JCGD-202507-0001', 'Empréstimos e Dívidas', false),
  ('2025-07-01', 'despesa', 775, 'COMPRA PAPELARIA FRAN 0000028665', 'JCGD-202507-0002', 'Compras e Roupa', false),
  ('2025-07-01', 'despesa', 2788, 'TRF CXDAPP', 'JCGD-202507-0003', 'Transferências internas', false),
  ('2025-07-01', 'despesa', 99, 'TRF IMEDIATA INT OIC 6704454264', 'JCGD-202507-0004', 'Taxas bancárias', false),
  ('2025-07-01', 'despesa', 850, 'Trf Mbway 915XXX084', 'JCGD-202507-0005', 'Pagamentos a pessoas', false),
  ('2025-06-30', 'despesa', 5500, 'COMPRAS C.DEB BASECAM 1626310017', 'JCGD-202507-0006', 'Assinaturas e Digital', false),
  ('2025-07-04', 'despesa', 1599, 'FNAC', 'JCGD-202507-0007', 'Compras e Roupa', false),
  ('2025-07-06', 'receita', 1600, 'TFI Joana Palminha', 'JCGD-202507-0008', 'Transferências internas', false),
  ('2025-07-06', 'receita', 2400, 'TFI Joana Palminha', 'JCGD-202507-0009', 'Transferências internas', false),
  ('2025-07-07', 'despesa', 4099, 'COFIDIS C FINANC POU', 'JCGD-202507-0010', 'Empréstimos e Dívidas', false),
  ('2025-07-07', 'receita', 1400, 'TFI Joana Palminha', 'JCGD-202507-0011', 'Transferências internas', false),
  ('2025-07-07', 'receita', 2500, 'TFI Joana Palminha', 'JCGD-202507-0012', 'Transferências internas', false),
  ('2025-07-06', 'despesa', 1456, 'COMPRAS C.DEB TESCO S 1628888972', 'JCGD-202507-0013', 'Supermercado', false),
  ('2025-07-09', 'despesa', 2500, 'Trf Mbway 968XXX571', 'JCGD-202507-0014', 'Pagamentos a pessoas', false),
  ('2025-07-10', 'receita', 100, 'TFI Joana Palminha', 'JCGD-202507-0015', 'Transferências internas', false),
  ('2025-07-10', 'receita', 2000, 'TFI Joana Palminha', 'JCGD-202507-0016', 'Transferências internas', false),
  ('2025-07-16', 'receita', 1000, 'TFI SONIA MARIA FERRE', 'JCGD-202507-0017', 'Recebimentos de pessoas', false),
  ('2025-07-15', 'despesa', 2174, 'COMPRA INTERNET FOTOS 1630412048', 'JCGD-202507-0018', 'Compras e Roupa', false),
  ('2025-07-17', 'receita', 500, 'TFI Joana Palminha', 'JCGD-202507-0019', 'Transferências internas', false),
  ('2025-07-17', 'despesa', 1500, 'COMPRAS C.DEB SOPHEE 1633565030', 'JCGD-202507-0020', 'Outros', true),
  ('2025-07-21', 'receita', 16000, 'TFI Joana Palminha', 'JCGD-202507-0021', 'Transferências internas', false),
  ('2025-08-01', 'despesa', 6877, 'COFIDIS', 'JCGD-202508-0001', 'Empréstimos e Dívidas', false),
  ('2025-08-01', 'despesa', 2850, 'COFIDIS', 'JCGD-202508-0002', 'Empréstimos e Dívidas', false),
  ('2025-08-01', 'despesa', 694, 'TRF CXDAPP', 'JCGD-202508-0003', 'Transferências internas', false),
  ('2025-08-01', 'despesa', 99, 'TRF IMEDIATA INT OIC 6707076465', 'JCGD-202508-0004', 'Taxas bancárias', false),
  ('2025-07-31', 'despesa', 5500, 'COMPRAS C.DEB BASECAM 1639711873', 'JCGD-202508-0005', 'Assinaturas e Digital', false),
  ('2025-08-14', 'receita', 4000, 'TFI SONIA MARIA FERRE', 'JCGD-202508-0006', 'Recebimentos de pessoas', false),
  ('2025-08-15', 'despesa', 3900, 'TRF CXDAPP', 'JCGD-202508-0007', 'Transferências internas', false),
  ('2025-08-15', 'despesa', 99, 'TRF IMEDIATA INT OIC 6708126020', 'JCGD-202508-0008', 'Taxas bancárias', false),
  ('2025-08-19', 'receita', 7000, 'TFI SONIA MARIA FERRE', 'JCGD-202508-0009', 'Recebimentos de pessoas', false),
  ('2025-08-19', 'despesa', 6900, 'TRF CXDAPP', 'JCGD-202508-0010', 'Transferências internas', false),
  ('2025-08-19', 'despesa', 99, 'TRF IMEDIATA INT OIC 6708267375', 'JCGD-202508-0011', 'Taxas bancárias', false),
  ('2025-08-31', 'receita', 15500, 'TFI Joana Palminha', 'JCGD-202508-0012', 'Transferências internas', false),
  ('2025-09-01', 'despesa', 6877, 'COFIDIS', 'JCGD-202509-0001', 'Empréstimos e Dívidas', false),
  ('2025-09-01', 'despesa', 2850, 'COFIDIS', 'JCGD-202509-0002', 'Empréstimos e Dívidas', false),
  ('2025-09-01', 'receita', 900, 'TFI Joana Palminha', 'JCGD-202509-0003', 'Transferências internas', false),
  ('2025-08-31', 'despesa', 5500, 'COMPRAS C.DEB BASECAM 1653321800', 'JCGD-202509-0004', 'Assinaturas e Digital', false),
  ('2025-09-01', 'despesa', 900, 'COMPRAS C.DEB PHOTO-M 1653620026', 'JCGD-202509-0005', 'Compras e Roupa', false),
  ('2025-09-19', 'receita', 3000, 'TFI SONIA MARIA FERRE', 'JCGD-202509-0006', 'Recebimentos de pessoas', false),
  ('2025-09-19', 'receita', 3500, 'TFI SONIA MARIA FERRE', 'JCGD-202509-0007', 'Recebimentos de pessoas', false),
  ('2025-09-19', 'despesa', 6600, 'TRF CXDAPP', 'JCGD-202509-0008', 'Transferências internas', false),
  ('2025-09-19', 'despesa', 99, 'TRF IMEDIATA INT OIC 6710627021', 'JCGD-202509-0009', 'Taxas bancárias', false),
  ('2025-09-25', 'receita', 4300, 'TFI ANA CLAUDIA MARQU', 'JCGD-202509-0010', 'Recebimentos de pessoas', false),
  ('2025-09-26', 'receita', 1030, 'TFI SONIA MARIA FERRE', 'JCGD-202509-0011', 'Recebimentos de pessoas', false),
  ('2025-09-26', 'despesa', 5300, 'TRF CXDAPP', 'JCGD-202509-0012', 'Transferências internas', false),
  ('2025-09-26', 'despesa', 99, 'TRF IMEDIATA INT OIC 6711112574', 'JCGD-202509-0013', 'Taxas bancárias', false),
  ('2025-09-27', 'receita', 1135, 'TFI ANA CLAUDIA MARQU', 'JCGD-202509-0014', 'Recebimentos de pessoas', false),
  ('2025-09-27', 'despesa', 1000, 'TFI joana palminha', 'JCGD-202509-0015', 'Transferências internas', false),
  ('2025-09-29', 'receita', 15500, 'TFI Joana Palminha', 'JCGD-202509-0016', 'Transferências internas', false),
  ('2025-09-27', 'despesa', 99, 'TRF IMEDIATA INT OIC 6711201688', 'JCGD-202509-0017', 'Taxas bancárias', false),
  ('2025-10-01', 'despesa', 6877, 'COFIDIS', 'JCGD-202510-0001', 'Empréstimos e Dívidas', false),
  ('2025-10-01', 'despesa', 2850, 'COFIDIS', 'JCGD-202510-0002', 'Empréstimos e Dívidas', false),
  ('2025-10-01', 'despesa', 217, 'TRF CXDAPP', 'JCGD-202510-0003', 'Transferências internas', false),
  ('2025-10-01', 'despesa', 99, 'TRF IMEDIATA INT OIC 6711603532', 'JCGD-202510-0004', 'Taxas bancárias', false),
  ('2025-09-30', 'despesa', 5500, 'COMPRAS C.DEB BASECAM 1666661246', 'JCGD-202510-0005', 'Assinaturas e Digital', false),
  ('2025-10-10', 'receita', 1500, 'TFI Joana Palminha', 'JCGD-202510-0006', 'Transferências internas', false),
  ('2025-10-10', 'despesa', 1400, 'Trf Mbway 966XXX508', 'JCGD-202510-0007', 'Pagamentos a pessoas', false),
  ('2025-10-31', 'receita', 15000, 'TFI Joana Palminha', 'JCGD-202510-0008', 'Transferências internas', false),
  ('2025-11-03', 'despesa', 6877, 'COFIDIS', 'JCGD-202511-0001', 'Empréstimos e Dívidas', false),
  ('2025-10-31', 'despesa', 5500, 'COMPRAS C.DEB BASECAM 1680252077', 'JCGD-202511-0002', 'Assinaturas e Digital', false),
  ('2025-11-05', 'despesa', 4098, 'COFIDIS C FINANC POU', 'JCGD-202511-0003', 'Empréstimos e Dívidas', false),
  ('2025-11-05', 'receita', 1400, 'TFI Joana Palminha', 'JCGD-202511-0004', 'Transferências internas', false),
  ('2025-11-19', 'receita', 100, 'TFI Joana Palminha', 'JCGD-202511-0005', 'Transferências internas', false),
  ('2025-11-19', 'receita', 4000, 'TFI SONIA MARIA FERRE', 'JCGD-202511-0006', 'Recebimentos de pessoas', false),
  ('2025-11-19', 'despesa', 4026, 'TRF CXDAPP', 'JCGD-202511-0007', 'Transferências internas', false),
  ('2025-11-19', 'despesa', 99, 'TRF IMEDIATA INT OIC 6725539188', 'JCGD-202511-0008', 'Taxas bancárias', false),
  ('2025-11-30', 'receita', 11000, 'TFI Joana Palminha', 'JCGD-202511-0009', 'Transferências internas', false),
  ('2025-12-02', 'despesa', 6877, 'COFIDIS', 'JCGD-202512-0001', 'Empréstimos e Dívidas', false),
  ('2025-12-02', 'despesa', 2850, 'COFIDIS', 'JCGD-202512-0002', 'Empréstimos e Dívidas', false),
  ('2025-12-28', 'receita', 4000, 'TFI ARMANDO FERNANDES', 'JCGD-202512-0003', 'Recebimentos de pessoas', false),
  ('2025-12-29', 'despesa', 5100, 'TRF CXDAPP', 'JCGD-202512-0004', 'Transferências internas', false),
  ('2025-12-29', 'despesa', 99, 'TRF IMEDIATA INT OIC 6739066391', 'JCGD-202512-0005', 'Taxas bancárias', false),
  ('2026-01-01', 'receita', 11000, 'TFI Joana Palminha', 'JCGD-202601-0001', 'Transferências internas', false),
  ('2026-01-02', 'despesa', 6877, 'COFIDIS', 'JCGD-202601-0002', 'Empréstimos e Dívidas', false),
  ('2026-01-02', 'despesa', 2850, 'COFIDIS', 'JCGD-202601-0003', 'Empréstimos e Dívidas', false),
  ('2026-01-02', 'despesa', 1200, 'TRF CXDAPP', 'JCGD-202601-0004', 'Transferências internas', false),
  ('2026-01-02', 'despesa', 99, 'TRF IMEDIATA INT OIC 6740697395', 'JCGD-202601-0005', 'Taxas bancárias', false),
  ('2026-01-31', 'receita', 11000, 'TFI Joana Palminha', 'JCGD-202601-0006', 'Transferências internas', false),
  ('2026-02-02', 'despesa', 6877, 'COFIDIS', 'JCGD-202602-0001', 'Empréstimos e Dívidas', false),
  ('2026-02-02', 'despesa', 2850, 'COFIDIS', 'JCGD-202602-0002', 'Empréstimos e Dívidas', false),
  ('2026-02-02', 'despesa', 1200, 'TRF CXDAPP', 'JCGD-202602-0003', 'Transferências internas', false),
  ('2026-02-02', 'despesa', 99, 'TRF IMEDIATA INT OIC 6750174908', 'JCGD-202602-0004', 'Taxas bancárias', false),
  ('2026-03-01', 'receita', 11000, 'TFI Joana Palminha', 'JCGD-202603-0001', 'Transferências internas', false),
  ('2026-03-02', 'despesa', 6877, 'COFIDIS', 'JCGD-202603-0002', 'Empréstimos e Dívidas', false),
  ('2026-03-02', 'despesa', 2850, 'COFIDIS', 'JCGD-202603-0003', 'Empréstimos e Dívidas', false),
  ('2026-03-05', 'despesa', 1100, 'TRF CXDAPP', 'JCGD-202603-0004', 'Transferências internas', false),
  ('2026-03-05', 'despesa', 99, 'TRF IMEDIATA INT OIC 6760763042', 'JCGD-202603-0005', 'Taxas bancárias', false),
  ('2026-04-01', 'receita', 10000, 'TFI Joana Palminha', 'JCGD-202604-0001', 'Transferências internas', false),
  ('2026-04-02', 'despesa', 9900, 'TRF CXDAPP', 'JCGD-202604-0002', 'Transferências internas', false),
  ('2026-04-02', 'despesa', 99, 'TRF IMEDIATA INT OIC 6770041475', 'JCGD-202604-0003', 'Taxas bancárias', false),
  ('2026-04-27', 'receita', 10000, 'TFI Joana Palminha', 'JCGD-202604-0004', 'Transferências internas', false),
  ('2026-05-04', 'despesa', 6877, 'COFIDIS', 'JCGD-202605-0001', 'Empréstimos e Dívidas', false),
  ('2026-05-04', 'despesa', 2850, 'COFIDIS', 'JCGD-202605-0002', 'Empréstimos e Dívidas', false),
  ('2026-05-30', 'receita', 10000, 'TFI Joana Palminha', 'JCGD-202605-0003', 'Transferências internas', false),
  ('2026-06-01', 'despesa', 6877, 'COFIDIS', 'JCGD-202606-0001', 'Empréstimos e Dívidas', false),
  ('2026-06-01', 'despesa', 2850, 'COFIDIS', 'JCGD-202606-0002', 'Empréstimos e Dívidas', false)
) as v(data, tipo, centavos, descricao, external_id, categoria, revisar)
on conflict (account_id, external_id) where external_id is not null do nothing;

commit;

-- Conferência depois de rodar (saldo deve fechar em 6.44 €):
-- select a.name, count(*) as lancamentos,
--        a.initial_balance_cents / 100.0
--        + sum(case when t.type='receita' then t.amount_cents else -t.amount_cents end)/100.0
--          as saldo_final
-- from public.transactions t join public.accounts a on a.id = t.account_id
-- where a.name = 'CGD' group by a.name, a.initial_balance_cents;
