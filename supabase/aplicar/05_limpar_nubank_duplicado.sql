-- Corrige a duplicação de contas "Nubank" causada pelo UPDATE de
-- 04_corrigir_saldo_nubank.sql, que filtrava só por `name = 'Nubank'` sem
-- checar antes se havia mais de uma conta com esse nome.
--
-- 1. Rodar SÓ o diagnóstico primeiro (as duas primeiras queries, sem o
--    delete) e conferir: deve aparecer 1 linha com num_transacoes = 435 e
--    outras com num_transacoes = 0.

select
  a.id,
  a.created_at,
  a.owner_profile_id,
  a.initial_balance_cents,
  count(t.id) as num_transacoes
from public.accounts a
left join public.transactions t on t.account_id = a.id
where a.name = 'Nubank'
group by a.id, a.created_at, a.owner_profile_id, a.initial_balance_cents
order by a.created_at;

-- 2. Se o diagnóstico bater com o esperado (1 conta com 435 transações, as
--    outras com 0), rodar o delete abaixo. Ele só apaga contas 'Nubank' que
--    não têm NENHUMA transação — a que tem as 435 fica intocada, garantido
--    pelo `not in`, não por confiar em qual foi criada primeiro.

delete from public.accounts
where name = 'Nubank'
  and id not in (
    select distinct account_id from public.transactions where account_id is not null
  );

-- 3. Conferência final — agora tem que aparecer 1 linha só, balance_cents = 668.

select a.name, b.balance_cents, b.currency
from public.accounts a
join public.account_balances b on b.account_id = a.id
where a.name = 'Nubank';
