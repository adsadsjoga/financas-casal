-- Importação Trading 212 (Joana, EUR) — gerado por scripts/gerar_import_cgd_joana.py
-- 206 lançamentos.
--
-- Rodar INTEIRO de uma vez no SQL Editor do Supabase. Idempotente pra
-- 197 linhas com 'ID' da planilha (external_id). As 9 sem
-- ID (dividendos pequenos sem referência única) dependem só do fingerprint
-- automático do trigger — rodar este script duas vezes pode duplicá-las.
--
-- SEM saldo inicial confirmado por extrato (diferente do CGD) — a planilha
-- não traz reconciliação bancária pra esta conta. Saldo inicial = 0, mesma
-- decisão já tomada pro Nubank; ajustar depois manualmente em /contas.

begin;

-- 1. A conta. `accounts` não tem unique constraint em nome — `where not
--    exists` evita criar duas contas 'Trading 212' se rodar duas vezes.
insert into public.accounts
  (couple_id, name, type, currency, owner_profile_id, initial_balance_cents, color)
select c.id, 'Trading 212', 'banco', 'EUR', m.profile_id, 0, '#f59e0b'
from public.couples c
join public.couple_members m on m.couple_id = c.id
join public.profiles p on p.id = m.profile_id
where p.display_name ilike 'joana%'
  and not exists (
    select 1 from public.accounts a where a.couple_id = c.id and a.name = 'Trading 212'
  );

-- 2. Categorias — todas já deveriam existir no app (nenhuma nova por
--    desenho). `on conflict do nothing` só como rede de segurança:
--    - Alimentação fora (despesa)
--    - Compras e Roupa (despesa)
--    - Investimentos (despesa)
--    - Investimentos (receita)
--    - Outras despesas (despesa)
--    - Outras receitas (receita)
--    - Supermercado (despesa)
--    - Transferências internas (despesa)
--    - Transferências internas (receita)
--    - Transporte (despesa)
--    - Viagem (despesa)
insert into public.categories (couple_id, name, kind, icon)
select c.id, v.name, v.kind::public.category_kind, v.icon
from public.couples c, (values
  ('Alimentação fora', 'despesa', '📦'),
  ('Compras e Roupa', 'despesa', '🛍️'),
  ('Investimentos', 'despesa', '📦'),
  ('Investimentos', 'receita', '📦'),
  ('Outras despesas', 'despesa', '📦'),
  ('Outras receitas', 'receita', '📦'),
  ('Supermercado', 'despesa', '🛒'),
  ('Transferências internas', 'despesa', '🔄'),
  ('Transferências internas', 'receita', '🔄'),
  ('Transporte', 'despesa', '📦'),
  ('Viagem', 'despesa', '📦')
) as v(name, kind, icon)
on conflict do nothing;

-- 3. Os lançamentos.
with conta as (
       select a.id, a.couple_id from public.accounts a
       join public.profiles p on p.id = a.owner_profile_id
       where p.display_name ilike 'joana%' and a.name = 'Trading 212' limit 1
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
  ('2025-09-22', 'receita', 100, 'Deposit', 'cba848d2-b8ef-4a5c-ab64-b08396f26757', 'Transferências internas', false),
  ('2025-09-22', 'receita', 5000, 'Deposit', 'fe072fa2-ca24-4576-a76f-537dd12f6e7a', 'Transferências internas', false),
  ('2025-09-22', 'despesa', 4300, 'Card debit — Irish Citylink', '4a35d935-9f5f-4414-8d4b-047e2517a6d0', 'Transporte', false),
  ('2025-09-22', 'receita', 1893, 'Deposit', '9f0b83a0-5392-4914-b008-659610843caf', 'Transferências internas', true),
  ('2025-09-22', 'despesa', 1893, 'Market buy — META Meta Platforms', 'EOF39154336907', 'Investimentos', false),
  ('2025-09-24', 'receita', 64, 'Spending cashback', 'cc8698f5-edd3-43e2-a75f-968a8034e831', 'Outras receitas', false),
  ('2025-09-25', 'receita', 2000, 'Deposit', '97217214-baee-429d-a507-f601a9bea2b6', 'Transferências internas', false),
  ('2025-09-25', 'despesa', 2070, 'Card debit — Lidl', 'e7ae064b-19ac-4371-8255-298e9504e577', 'Supermercado', false),
  ('2025-09-26', 'receita', 2000, 'Deposit', '20082d84-7530-4b60-b214-aa44d8f9f099', 'Transferências internas', false),
  ('2025-09-26', 'despesa', 2450, 'Card debit — Aldi', '24b310ab-4298-485f-90f9-feb271ee1e91', 'Supermercado', false),
  ('2025-09-27', 'receita', 31, 'Spending cashback', 'a6de2324-2b95-45bd-a833-5f4273c3a981', 'Outras receitas', false),
  ('2025-09-28', 'receita', 37, 'Spending cashback', '54eb286b-685f-47df-b221-04e7e1c86946', 'Outras receitas', false),
  ('2025-09-28', 'receita', 1000, 'Deposit', '5b0f1938-49c5-49ea-8028-e3828aa8931e', 'Transferências internas', false),
  ('2025-09-28', 'despesa', 789, 'Card debit — TESCO STORES   3521', '047b8d5a-52a1-405b-995d-b92865ae8fb3', 'Supermercado', false),
  ('2025-09-29', 'despesa', 132, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF39452806199', 'Investimentos', false),
  ('2025-09-30', 'receita', 12, 'Spending cashback', '42d9fbcb-326d-4301-880c-3c13bd09ca8a', 'Outras receitas', false),
  ('2025-09-30', 'despesa', 491, 'Market buy — BARC Barclays', 'EOF39516137245', 'Investimentos', false),
  ('2025-10-02', 'receita', 4000, 'Deposit', '1fd0f738-b670-41c9-9c9a-329b4dcd869a', 'Transferências internas', false),
  ('2025-10-02', 'despesa', 1700, 'Card debit — Irish Citylink', '23587bd8-ad06-48c8-a7f4-ca18ee886631', 'Transporte', false),
  ('2025-10-03', 'despesa', 700, 'Card debit — Tesco', 'bda8d6e6-136f-4684-9b30-f3419bf527dc', 'Supermercado', false),
  ('2025-10-04', 'receita', 25, 'Spending cashback', '76f05b6c-64ad-4c23-be24-fd4d32867f2a', 'Outras receitas', false),
  ('2025-10-04', 'despesa', 378, 'Card debit — Tesco', '23172c89-6d46-494c-a4d6-e7061d9cda4a', 'Supermercado', false),
  ('2025-10-05', 'receita', 11, 'Spending cashback', 'ab3cfc2a-2a82-41a0-b84a-fa1437d774d1', 'Outras receitas', false),
  ('2025-10-05', 'receita', 3000, 'Deposit', '95cfa438-06e1-4931-b2e6-2954c42df9a8', 'Transferências internas', false),
  ('2025-10-05', 'despesa', 2500, 'Card debit — ACS*', 'd409834d-132f-41d3-9245-664ac3034c7f', 'Outras despesas', true),
  ('2025-10-06', 'receita', 5, 'Spending cashback', 'aaf36831-2e06-40d6-b08f-d68beb2e298d', 'Outras receitas', false),
  ('2025-10-07', 'despesa', 1050, 'Card debit — Bus Éireann', 'd80ae339-701b-4ace-b75f-7d7726de0749', 'Transporte', false),
  ('2025-10-08', 'receita', 38, 'Spending cashback', 'b4460133-16c3-47a0-91fd-7619ba0020f7', 'Outras receitas', false),
  ('2025-10-08', 'despesa', 220, 'Card debit — FNC 9027', '813bb107-e6b4-4a0c-af8e-acbf86718b91', 'Outras despesas', true),
  ('2025-10-08', 'receita', 40000, 'Deposit', '85a9592a-c012-4366-b64a-e2d1d8eb3182', 'Transferências internas', false),
  ('2025-10-08', 'receita', 1000, 'Deposit', '7b9cbf57-aadf-470b-bfbd-b6336a9ec2d0', 'Transferências internas', false),
  ('2025-10-08', 'despesa', 40665, 'Card debit — WWW.FUNCHALDRIVE.COM', '563e2041-abf1-4c21-9ffb-d6f694c1a40c', 'Outras despesas', true),
  ('2025-10-09', 'receita', 16, 'Spending cashback', '24b38ce4-3b8d-43cb-8bb9-0fbad2b2e972', 'Outras receitas', false),
  ('2025-10-09', 'despesa', 325, 'Card debit — Ryanair', '9ea9308f-b4d0-4aba-af79-20422e35c342', 'Viagem', true),
  ('2025-10-09', 'despesa', 107, 'Market buy — BARC Barclays', 'EOF39963908508', 'Investimentos', false),
  ('2025-10-09', 'receita', 5000, 'Deposit', 'a27f4704-13e6-46b5-af5b-617139445c19', 'Transferências internas', false),
  ('2025-10-09', 'despesa', 1732, 'Card debit — SUPERMERCADO AMANHEC', '5263df0b-8f98-4180-b139-f50e24ee512f', 'Compras e Roupa', false),
  ('2025-10-09', 'despesa', 3150, 'Card debit — REST EMB MADEIRENSE', '3d275491-6e65-4f89-9a3e-9e8e303553be', 'Alimentação fora', false),
  ('2025-10-09', 'despesa', 410, 'Card debit — Almirante Reis', 'd0247416-95ce-4873-bccf-c212e34f8390', 'Transporte', false),
  ('2025-10-10', 'receita', 613, 'Spending cashback', 'a476b001-b470-40fd-8b16-04426b51962e', 'Outras receitas', false),
  ('2025-10-10', 'despesa', 613, 'Market buy — BARC Barclays', 'EOF40013081765', 'Investimentos', false),
  ('2025-10-10', 'receita', 7000, 'Deposit', 'a2f1615c-f90c-4f0c-86d1-58ff94e58cae', 'Transferências internas', false),
  ('2025-10-10', 'despesa', 470, 'Card debit — SANCRUPAN', '81143094-c21f-4260-9779-24ccaeab21df', 'Compras e Roupa', false),
  ('2025-10-10', 'despesa', 2390, 'Card debit — NICE SOUVENIR', 'e07ffd82-0e31-4d85-a4cc-1f672c27125b', 'Outras despesas', true),
  ('2025-10-10', 'despesa', 500, 'Card debit — PISCINAS NATURAIS', '64cb8738-0cf4-4f09-b8ba-2f3c79bf5d58', 'Outras despesas', true),
  ('2025-10-10', 'despesa', 350, 'Card debit — SOUV  PORTO MONIZ', '81c65e19-859a-4a8a-8657-df9855b4a57f', 'Outras despesas', true),
  ('2025-10-10', 'despesa', 2790, 'Card debit — Repsol', 'fae7290b-ae0a-4f74-a963-08e0c6ca688d', 'Outras despesas', true),
  ('2025-10-11', 'receita', 84, 'Spending cashback', 'b3e2df6e-3288-4e9b-b757-727c3e729f5a', 'Outras receitas', false),
  ('2025-10-11', 'receita', 6000, 'Deposit', '2666165e-63fb-4504-879d-372dada84808', 'Transferências internas', false),
  ('2025-10-11', 'despesa', 1245, 'Card debit — SUPERMERCADO AMANHEC', 'ce132608-a1e0-454d-9cf6-c3906e819d72', 'Compras e Roupa', false),
  ('2025-10-11', 'despesa', 490, 'Card debit — AVENIDA GASTROPUB', 'a6445229-5d66-4c8e-814f-00563b42e235', 'Alimentação fora', false),
  ('2025-10-11', 'despesa', 1797, 'Card debit — Amoraginja', '3532f50a-62df-4402-886d-75f68711ab94', 'Compras e Roupa', false),
  ('2025-10-11', 'despesa', 600, 'Card debit — Miradouro do Cabo Girão', '43960393-c28f-49ed-b3b2-7df5d31289ec', 'Outras despesas', true),
  ('2025-10-12', 'receita', 90, 'Spending cashback', 'abd7611f-5876-4ce7-bd4d-2930f90da19d', 'Outras receitas', false),
  ('2025-10-12', 'despesa', 500, 'Card debit — PAST. JARDIM GAULA', 'd9ae37f1-6776-419b-8761-d3a29e84b536', 'Alimentação fora', false),
  ('2025-10-12', 'despesa', 179, 'Card debit — SUPERMERCADO AMANHEC', 'c7e3aea1-9ea3-493c-bc86-7068976774ad', 'Compras e Roupa', false),
  ('2025-10-13', 'receita', 62, 'Spending cashback', 'e5afb818-d572-45d9-a037-c705fe5693d0', 'Outras receitas', false),
  ('2025-10-13', 'despesa', 174, 'Market buy — BARC Barclays', 'EOF40150412034', 'Investimentos', false),
  ('2025-10-14', 'receita', 10, 'Spending cashback', 'e2b7a088-fcbc-4313-bc64-04b070b684be', 'Outras receitas', false),
  ('2025-10-14', 'despesa', 1390, 'Card debit — FESTIM DE SUGESTOES-UN', '4fae3fed-2a51-4ac5-abe6-81a89aa65994', 'Viagem', false),
  ('2025-10-14', 'receita', 6000, 'Deposit', '2155b824-bdb1-4f5c-9063-9cf1cae0c257', 'Transferências internas', false),
  ('2025-10-14', 'despesa', 5561, 'Card debit — Repsol', '1de95635-c77e-41f6-bd5a-07449f1ea52a', 'Outras despesas', true),
  ('2025-10-15', 'despesa', 497, 'Card debit — Aldi', 'fd127740-4857-4559-8f49-5f53a412dd39', 'Supermercado', false),
  ('2025-10-16', 'receita', 105, 'Spending cashback', '40b090fa-aa02-438e-9a42-fc9b9e4eab10', 'Outras receitas', false),
  ('2025-10-16', 'despesa', 105, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF40314164918', 'Investimentos', false),
  ('2025-10-17', 'receita', 7, 'Spending cashback', 'fc2b05f0-cb3e-4500-a6a0-bee48be8ddcf', 'Outras receitas', false),
  ('2025-10-19', 'receita', 1000, 'Deposit', 'a6b7367d-45ef-49b3-8155-618839b64de0', 'Transferências internas', false),
  ('2025-10-19', 'despesa', 1100, 'Card debit — Irish Citylink', 'dbd94aa0-454d-404a-a9d7-2b20c0dfad20', 'Transporte', false),
  ('2025-10-21', 'receita', 16, 'Spending cashback', '82c453a8-77f6-4e53-8454-b9c19ce384ba', 'Outras receitas', false),
  ('2025-10-23', 'receita', 15000, 'Deposit', '76ccf4e2-f0cc-4421-87aa-80df2f6f66a0', 'Transferências internas', false),
  ('2025-10-23', 'despesa', 13979, 'Card debit — SSE Airtricity', '8640bc62-a400-4e56-b241-31d900f425a5', 'Outras despesas', true),
  ('2025-10-23', 'receita', 1000, 'Deposit', '28e96ede-2915-450e-a589-46ac85f7348c', 'Transferências internas', false),
  ('2025-10-23', 'despesa', 600, 'Card debit — Irish Rail', '3fb680bf-b832-4dc2-84c7-12c74722e98d', 'Transporte', false),
  ('2025-10-23', 'despesa', 460, 'Card debit — Dunnes Stores', 'b171b6a8-dab8-4413-a43a-e330b96cd27b', 'Supermercado', false),
  ('2025-10-24', 'despesa', 1295, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF40801421228', 'Investimentos', false),
  ('2025-10-25', 'receita', 16, 'Spending cashback', '9042f469-9036-43ff-9791-69eeb6b87362', 'Outras receitas', false),
  ('2025-10-30', 'receita', 5000, 'Deposit', 'cb6274ef-fd1c-42ad-a8ba-d4015b1e1824', 'Transferências internas', false),
  ('2025-10-30', 'despesa', 600, 'Card debit — Irish Rail', '8870a84a-0277-4867-8cbf-7c5854b90f70', 'Transporte', false),
  ('2025-10-31', 'despesa', 3000, 'Card debit — DOOCTOR.IE', '513041ff-086c-467b-8216-4d3b8fa9cc8e', 'Outras despesas', true),
  ('2025-10-31', 'receita', 100, 'Market sell — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF41151659929', 'Investimentos', false),
  ('2025-10-31', 'despesa', 1439, 'Card debit — Irish Rail', 'f5f2caa1-346b-4ca8-a24e-e0c93afc9c1b', 'Transporte', false),
  ('2025-10-31', 'despesa', 65, 'Card debit — TFI GO', '1a08290c-7226-4e1d-be5a-da1aae494f85', 'Transporte', false),
  ('2025-11-01', 'receita', 9, 'Spending cashback', '2f8259a4-0a17-4b5c-9c1f-dbd962cd3ed1', 'Outras receitas', false),
  ('2025-11-02', 'receita', 68, 'Spending cashback', 'eb555b71-1fa8-4c8f-8bf7-30aa98fbe134', 'Outras receitas', false),
  ('2025-11-02', 'receita', 5000, 'Deposit', '11f6df95-e84d-4e32-97f3-e38be65d9c97', 'Transferências internas', false),
  ('2025-11-02', 'despesa', 2500, 'Card debit — ACS*', 'c5bf0c51-1269-4f6a-802e-4505a65c44a7', 'Outras despesas', true),
  ('2025-11-03', 'despesa', 1572, 'Card debit — Aldi', '5442ca51-8466-4f42-bee9-f1a5a3182958', 'Supermercado', false),
  ('2025-11-05', 'receita', 61, 'Spending cashback', 'c7a4362a-5dca-4f16-b578-67643b4e370e', 'Outras receitas', false),
  ('2025-11-05', 'despesa', 138, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF41364702315', 'Investimentos', false),
  ('2025-11-05', 'receita', 2000, 'Deposit', 'a449af50-132d-466d-8319-1c7b5f72bfef', 'Transferências internas', false),
  ('2025-11-05', 'despesa', 1700, 'Card debit — Irish Citylink', 'abfe24cd-95ff-47b4-8d15-ab3326014937', 'Transporte', false),
  ('2025-11-06', 'despesa', 65, 'Card debit — TFI GO', '097b2fb1-fa7b-48f8-889a-28d1bee9d5b5', 'Transporte', false),
  ('2025-11-07', 'receita', 26, 'Spending cashback', 'ff10462c-4ee0-4182-8dcb-ddd2451e45fa', 'Outras receitas', false),
  ('2025-11-07', 'despesa', 660, 'Card debit — Dunnes Stores', '8841aff4-8beb-4683-b1f4-0f94fa08c22e', 'Supermercado', false),
  ('2025-11-07', 'receita', 5000, 'Deposit', '2d2d20f5-215f-4644-bb21-83a6c6efa813', 'Transferências internas', false),
  ('2025-11-09', 'receita', 10, 'Spending cashback', '20314d7c-cfd1-453c-b574-956b563305ee', 'Outras receitas', false),
  ('2025-11-09', 'despesa', 65, 'Card debit — TFI GO', 'ffd15bc4-1daf-47b5-b77d-860331e2a62e', 'Transporte', false),
  ('2025-11-09', 'despesa', 299, 'Card debit — Aldi', '35693057-4d9c-443e-a3cd-412e9a88c284', 'Supermercado', false),
  ('2025-11-09', 'despesa', 190, 'Card debit — YOU STOP', 'ec823a28-782a-4ddb-aa4e-8f166d49803b', 'Compras e Roupa', false),
  ('2025-11-10', 'despesa', 1695, 'Card debit — 24 7 SHOP HENRY ST', '18d3d57b-c2da-49fe-97cc-97ac242d3e5b', 'Compras e Roupa', false),
  ('2025-11-10', 'receita', 20000, 'Deposit', '9ccc9f6b-aedf-4a42-9022-61acea061674', 'Transferências internas', false),
  ('2025-11-10', 'despesa', 22097, 'Card debit — Ryanair', '5d238b2b-4071-4dbc-a823-4b051f558614', 'Outras despesas', true),
  ('2025-11-11', 'receita', 9, 'Spending cashback', '7eefffab-3bfd-4e41-ab86-54f83072c5f8', 'Outras receitas', false),
  ('2025-11-12', 'receita', 357, 'Spending cashback', '1052d265-c5bd-400c-99a7-e59e70b43b5f', 'Outras receitas', false),
  ('2025-11-12', 'despesa', 402, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF41710157883', 'Investimentos', false),
  ('2025-11-13', 'despesa', 600, 'Card debit — Irish Rail', 'dbcd9c55-f8a9-49f9-b7ff-17436788464e', 'Transporte', false),
  ('2025-11-13', 'despesa', 200, 'Card debit — SIEGE COFFEE COMPA', '154d3c37-63cd-4ddd-bb23-b64c85887770', 'Alimentação fora', false),
  ('2025-11-15', 'receita', 3, 'Spending cashback', '82c76a80-b68c-493b-9933-62eda3f4055d', 'Outras receitas', false),
  ('2025-11-15', 'receita', 9, 'Spending cashback', 'e9ccf3c9-985f-4d6f-bdd8-16e077fa3fa9', 'Outras receitas', false),
  ('2025-11-16', 'receita', 20000, 'Deposit', '3e9be97c-ae0f-4a84-b9d4-338544edc9b0', 'Transferências internas', false),
  ('2025-11-16', 'despesa', 3999, 'Card debit — Currys', 'e16e5317-df3d-4b0a-82a0-346a7e9f76bf', 'Outras despesas', true),
  ('2025-11-16', 'despesa', 7562, 'Card debit — Amazon', '27fca61d-ba03-4ff2-9aa3-75880f52b87c', 'Outras despesas', true),
  ('2025-11-16', 'despesa', 199, 'Card debit — Lidl', 'f0949117-8d69-4c21-afd7-b06e4e5d746a', 'Supermercado', false),
  ('2025-11-18', 'receita', 2, 'Spending cashback', '23673aa0-7cd0-48b6-8e97-cb01e6b0e328', 'Outras receitas', false),
  ('2025-11-18', 'receita', 59, 'Spending cashback', '5442830f-3ee6-4ce0-bee1-c9aeda2fbbfa', 'Outras receitas', false),
  ('2025-11-18', 'despesa', 469, 'Card debit — TESCO STORES   3521', 'd430d8f7-488e-4362-ae13-3b745fded6e3', 'Supermercado', false),
  ('2025-11-19', 'receita', 113, 'Spending cashback', '91bd6248-7c73-4135-a5a4-7773ffeb09db', 'Outras receitas', false),
  ('2025-11-19', 'despesa', 186, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF42060259609', 'Investimentos', false),
  ('2025-11-20', 'receita', 7, 'Spending cashback', '46b5f6f1-57fc-4b3c-95e0-687ff9319d04', 'Outras receitas', false),
  ('2025-11-20', 'receita', 1482, 'Market sell — META Meta Platforms', 'EOF42150747721', 'Investimentos', false),
  ('2025-11-20', 'despesa', 3000, 'Market buy — TSM Taiwan Semiconductor Manufacturing', 'EOF42153114997', 'Investimentos', false),
  ('2025-11-21', 'despesa', 6000, 'Card debit — Specsavers', '6844b799-dd14-4322-94ca-f68dbc5bf3f9', 'Outras despesas', true),
  ('2025-11-22', 'receita', 35000, 'Deposit', '61690a29-c137-40e5-8b2b-628f5bfe5883', 'Transferências internas', false),
  ('2025-11-22', 'receita', 10000, 'Deposit', '8a6f4247-ff0a-43ea-83e1-9eed064d5d50', 'Outras receitas', true),
  ('2025-11-22', 'despesa', 40899, 'Card debit — Currys', '41687f70-f937-4b74-8571-83fc21ae0578', 'Outras despesas', true),
  ('2025-11-22', 'despesa', 2365, 'Card debit — POLONEZ', '1ef0781f-8e4b-4fe7-87bf-5972bdf8b85d', 'Compras e Roupa', false),
  ('2025-11-22', 'receita', 4500, 'Deposit', '79d82f2c-9bfd-4a5d-b5ff-131c2fd96ae5', 'Outras receitas', true),
  ('2025-11-22', 'despesa', 4500, 'Card debit — RSA', 'ddeaf64c-9be2-4dc7-9541-15c3e3add9d6', 'Outras despesas', true),
  ('2025-11-23', 'receita', 90, 'Spending cashback', '6c2c84c3-af7f-49f5-8752-2ced7ac3bcab', 'Outras receitas', false),
  ('2025-11-23', 'despesa', 430, 'Card debit — To Go Congelados', '38830abf-e040-4834-bd62-b7f4648b01e3', 'Compras e Roupa', false),
  ('2025-11-24', 'receita', 613, 'Spending cashback', '59c0a873-3344-452e-bb27-7f6ae2d693ce', 'Outras receitas', false),
  ('2025-11-24', 'receita', 35, 'Spending cashback', 'e52fbdbd-1a25-4592-8f61-5fd71804749e', 'Outras receitas', false),
  ('2025-11-24', 'despesa', 132, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF42210498431', 'Investimentos', false),
  ('2025-11-24', 'despesa', 613, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF42210498684', 'Investimentos', false),
  ('2025-11-25', 'receita', 6, 'Spending cashback', '534b6f8f-f086-4fe4-93b9-76afae792fb8', 'Outras receitas', false),
  ('2025-11-26', 'despesa', 398, 'Card debit — Garvey Group ', 'b667d052-e0ec-4747-a4e3-a8f4a91de805', 'Compras e Roupa', false),
  ('2025-11-28', 'receita', 5, 'Spending cashback', '87c712c4-14ab-48ba-a2b3-c0805acd8423', 'Outras receitas', false),
  ('2025-11-28', 'despesa', 579, 'Card debit — Garvey Group ', '5a88e024-5479-44c9-8619-b0e0296a35ad', 'Compras e Roupa', false),
  ('2025-11-29', 'despesa', 708, 'Card debit — Lidl', '21b769f1-3c46-4912-a1f9-5b83ea5298a0', 'Supermercado', false),
  ('2025-11-29', 'despesa', 65, 'Card debit — TFI GO', '88718519-2b80-4312-92db-328537c19d50', 'Transporte', false),
  ('2025-11-30', 'receita', 8, 'Spending cashback', '31316eed-9c58-4c8e-9482-69bb1ca1d72b', 'Outras receitas', false),
  ('2025-12-01', 'receita', 10, 'Spending cashback', '410563ff-5201-4a54-8de6-4dbec89fe9a8', 'Outras receitas', false),
  ('2025-12-12', 'receita', 10000, 'Deposit', '1bfc6917-ae85-4515-a8f9-b8566a48bd4c', 'Outras receitas', true),
  ('2025-12-12', 'despesa', 9208, 'Card debit — Ryanair', 'e5554f96-aa67-46db-8bed-7df1ad51d8d4', 'Outras despesas', true),
  ('2025-12-16', 'receita', 138, 'Spending cashback', '1e6b8250-7f71-4f16-933f-ed63d5f418d6', 'Outras receitas', false),
  ('2025-12-16', 'despesa', 167, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF43412560509', 'Investimentos', false),
  ('2025-12-31', 'despesa', 375, 'Card debit — Ryanair', 'ebec9bfa-1e4d-45f4-b771-7df817eb0269', 'Outras despesas', true),
  ('2026-01-02', 'receita', 5, 'Spending cashback', '5dc7e05c-d0b2-4f33-b9a2-7bf816e20a72', 'Outras receitas', false),
  ('2026-01-02', 'despesa', 65, 'Card debit — TFI GO', '2dfb9446-8078-491e-bc23-75955a8032ef', 'Transporte', false),
  ('2026-01-03', 'despesa', 65, 'Card debit — TFI GO', '9e27bc7a-b3f3-4654-8745-706b0baeac25', 'Transporte', false),
  ('2026-01-04', 'despesa', 65, 'Card debit — TFI GO', 'f7e64019-1f72-4606-b3df-a1d47ce95fa8', 'Transporte', false),
  ('2026-01-06', 'despesa', 400, 'Market buy — CHV Chevron', 'EOF44500798334', 'Investimentos', false),
  ('2026-01-07', 'receita', 30000, 'Deposit', '8afdb1dc-ec3e-4520-941e-44e3abb22248', 'Transferências internas', false),
  ('2026-01-07', 'despesa', 20000, 'Withdrawal', '41e92518-ba54-40f7-a98a-dd36b02d0536', 'Transferências internas', false),
  ('2026-01-07', 'despesa', 3000, 'Market buy — BARC Barclays', 'EOF44514828759', 'Investimentos', false),
  ('2026-01-07', 'despesa', 3000, 'Market buy — GDIG VanEck S&P Global Mining (Acc)', 'EOF44514829056', 'Investimentos', false),
  ('2026-01-07', 'despesa', 2000, 'Market buy — GDIG VanEck S&P Global Mining (Acc)', 'EOF44514829129', 'Investimentos', false),
  ('2026-01-07', 'despesa', 2000, 'Market buy — TSM Taiwan Semiconductor Manufacturing', 'EOF44554557455', 'Investimentos', false),
  ('2026-01-08', 'receita', 6, 'Dividend (Dividend) — TSM Taiwan Semiconductor Manufacturing', null, 'Investimentos', false),
  ('2026-03-03', 'receita', 10000, 'Deposit', '019cb57e-8334-7bcd-b7cb-5bfbb6b61b95', 'Outras receitas', true),
  ('2026-03-03', 'despesa', 2600, 'Market buy — TSM Taiwan Semiconductor Manufacturing', 'EOF47466866149', 'Investimentos', false),
  ('2026-03-04', 'despesa', 2800, 'Market buy — GDIG VanEck S&P Global Mining (Acc)', 'EOF47466892490', 'Investimentos', false),
  ('2026-03-04', 'despesa', 3000, 'Market buy — BARC Barclays', 'EOF47466899213', 'Investimentos', false),
  ('2026-03-04', 'despesa', 1606, 'Market buy — CHV Chevron', 'EOF47469766473', 'Investimentos', false),
  ('2026-03-10', 'receita', 4, 'Dividend (Dividend) — CHV Chevron', null, 'Investimentos', false),
  ('2026-03-31', 'receita', 55, 'Dividend (Dividend) — BARC Barclays', null, 'Investimentos', false),
  ('2026-04-09', 'receita', 17, 'Dividend (Dividend) — TSM Taiwan Semiconductor Manufacturing', null, 'Investimentos', false),
  ('2026-04-15', 'receita', 40000, 'Deposit', '019d8f9f-c533-7fff-b108-dba09f1982a1', 'Transferências internas', false),
  ('2026-04-15', 'despesa', 6000, 'Market buy — GDIG VanEck S&P Global Mining (Acc)', 'EOF49562696529', 'Investimentos', false),
  ('2026-04-15', 'despesa', 2000, 'Market buy — BARC Barclays', 'EOF49562697387', 'Investimentos', false),
  ('2026-04-15', 'despesa', 1085, 'Market buy — BARC Barclays', 'EOF49562697390', 'Investimentos', false),
  ('2026-04-15', 'despesa', 2109, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF49565406203', 'Investimentos', false),
  ('2026-04-15', 'despesa', 17891, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF49565406506', 'Investimentos', false),
  ('2026-04-15', 'despesa', 1201, 'Market buy — TSM Taiwan Semiconductor Manufacturing', 'EOF49604891415', 'Investimentos', false),
  ('2026-04-15', 'despesa', 4799, 'Market buy — TSM Taiwan Semiconductor Manufacturing', 'EOF49604896935', 'Investimentos', false),
  ('2026-05-18', 'receita', 45000, 'Deposit', '019e3992-5ded-78d5-bd0e-4bdd504dd149', 'Transferências internas', false),
  ('2026-05-18', 'despesa', 5063, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF51257300673', 'Investimentos', false),
  ('2026-05-18', 'despesa', 43800, 'Card debit — Azazie', '019e3b65-3d5d-74af-8996-a099cc79c94b', 'Compras e Roupa', false),
  ('2026-05-19', 'receita', 657, 'Spending cashback', '019e3dc7-b646-7d23-bd4e-cba2a2a1d321', 'Outras receitas', false),
  ('2026-05-19', 'receita', 30000, 'Deposit', '019e3eaa-19a9-7585-ac00-bd88b30b570b', 'Transferências internas', false),
  ('2026-05-19', 'despesa', 662, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF51275463581', 'Investimentos', false),
  ('2026-05-19', 'despesa', 10000, 'Market buy — V9N Global X Data Center REITs & Digital Infrastructure (Acc)', 'EOF51300860910', 'Investimentos', false),
  ('2026-05-19', 'despesa', 11000, 'Market buy — IRM Iron Mountain', 'EOF51303293373', 'Investimentos', false),
  ('2026-05-19', 'despesa', 5000, 'Market buy — AGNC AGNC Investment', 'EOF51303293377', 'Investimentos', false),
  ('2026-05-19', 'despesa', 4000, 'Market buy — TSM Taiwan Semiconductor Manufacturing', 'EOF51306155444', 'Investimentos', false),
  ('2026-05-19', 'despesa', 1200, 'Card debit — Garvey Group ', '019e45b3-8361-7083-b441-aaba3e746132', 'Compras e Roupa', false),
  ('2026-05-21', 'receita', 18, 'Spending cashback', '019e4814-2fdc-767f-a7c4-041456c51638', 'Outras receitas', false),
  ('2026-05-21', 'receita', 60000, 'Deposit', '019e49d1-9965-710b-aab1-c70ee3a2ed59', 'Transferências internas', false),
  ('2026-05-21', 'despesa', 20000, 'Market buy — VWCE Vanguard FTSE All-World (Acc)', 'EOF51402092205', 'Investimentos', false),
  ('2026-05-21', 'despesa', 14000, 'Market buy — VUAG Vanguard S&P 500 (Acc)', 'EOF51402092361', 'Investimentos', false),
  ('2026-05-21', 'despesa', 10000, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF51402092474', 'Investimentos', false),
  ('2026-05-21', 'despesa', 9000, 'Market buy — GDIG VanEck S&P Global Mining (Acc)', 'EOF51402092581', 'Investimentos', false),
  ('2026-06-09', 'receita', 50, 'Dividend (Dividend) — AGNC AGNC Investment', null, 'Investimentos', false),
  ('2026-06-10', 'receita', 17, 'Dividend (Dividend) — CHV Chevron', null, 'Investimentos', false),
  ('2026-07-06', 'receita', 66, 'Dividend (Dividend) — IRM Iron Mountain', null, 'Investimentos', false),
  ('2026-07-09', 'receita', 38, 'Dividend (Dividend) — TSM Taiwan Semiconductor Manufacturing', null, 'Investimentos', false),
  ('2026-07-10', 'receita', 50, 'Dividend (Dividend) — AGNC AGNC Investment', null, 'Investimentos', false),
  ('2026-08-03', 'receita', 50000, 'Deposit', '019fc98a-59d3-7ad6-8106-ce442e377e7f', 'Transferências internas', true),
  ('2026-08-04', 'despesa', 2000, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF55178996182', 'Investimentos', false),
  ('2026-08-04', 'despesa', 700, 'Market buy — BARC Barclays', 'EOF55178999788', 'Investimentos', false),
  ('2026-08-04', 'despesa', 3000, 'Market buy — VUAG Vanguard S&P 500 (Acc)', 'EOF55181803303', 'Investimentos', false),
  ('2026-08-04', 'despesa', 20000, 'Market buy — VDPG Vanguard FTSE Developed Asia Pacific ex Japan (Acc)', 'EOF55202391210', 'Investimentos', false),
  ('2026-08-04', 'despesa', 8000, 'Market buy — V9N Global X Data Center REITs & Digital Infrastructure (Acc)', 'EOF55202391303', 'Investimentos', false),
  ('2026-08-04', 'despesa', 14021, 'Market buy — VUAG Vanguard S&P 500 (Acc)', 'EOF55202391375', 'Investimentos', false),
  ('2026-08-04', 'despesa', 1500, 'Market buy — AGNC AGNC Investment', 'EOF55204929554', 'Investimentos', false),
  ('2026-08-04', 'despesa', 8000, 'Market buy — TSM Taiwan Semiconductor Manufacturing', 'EOF55207409612', 'Investimentos', false)
) as v(data, tipo, centavos, descricao, external_id, categoria, revisar)
on conflict (account_id, external_id) where external_id is not null do nothing;

commit;

-- Conferência depois de rodar:
-- select count(*) as lancamentos, count(*) filter (where needs_review) as revisar,
--        sum(case when t.type='receita' then t.amount_cents else -t.amount_cents end)/100.0
--          as variacao_liquida
-- from public.transactions t join public.accounts a on a.id = t.account_id
-- where a.name = 'Trading 212';
