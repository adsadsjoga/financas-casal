-- Corrige o saldo inicial da conta Nubank pro saldo real informado pelo
-- Gabriel: R$ 6,68 na conta corrente hoje (06/08/2026).
--
-- Conta: soma líquida dos 435 lançamentos importados = -R$ 4.198,80
-- (o saldo inicial tinha ficado em 0, porque o extrato não traz saldo de
-- abertura — ver supabase/aplicar/02_importar_nubank.sql).
--
-- saldo_inicial_novo = saldo_real_hoje - soma_liquida_importada
--                     = 6,68 - (-4.198,80) = 4.205,48

update public.accounts
set initial_balance_cents = 420548
where name = 'Nubank';

-- Conferência: deve mostrar balance_cents = 668 (R$ 6,68).
select a.name, b.balance_cents, b.currency
from public.accounts a
join public.account_balances b on b.account_id = a.id
where a.name = 'Nubank';
