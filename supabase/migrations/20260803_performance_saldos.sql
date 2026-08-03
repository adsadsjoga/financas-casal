-- =============================================================================
-- Corrige o saldo aparecendo zerado no app.
--
-- Sintoma: Contas e Home mostravam 0,00 (ou o saldo inicial tecnico) para
-- todas as contas, mesmo com os dados certos no banco. O log do servidor
-- mostrava:
--   code 57014 - canceling statement due to statement timeout
--
-- Causa medida com EXPLAIN (ANALYZE, BUFFERS) na view account_balances:
--   Execution Time: 8791 ms   (limite do role authenticated: 8s)
--   Buffers: shared hit=267667
--
-- Tres problemas somados:
--
-- 1) account_balances fazia LEFT JOIN + GROUP BY. O planner escolhia nested
--    loop e varria as ~5.000 transacoes UMA VEZ POR CONTA (loops=7,
--    "Rows Removed by Join Filter: 35442").
--
-- 2) A policy de transactions usava can_see_account(account_id), funcao
--    opaca chamada POR LINHA. Com 3 ramos de UNION ALL x 7 loops davam
--    ~106 mil chamadas por leitura de saldo - os dois ramos maiores
--    custavam 4.000ms + 3.927ms, praticamente o timeout inteiro.
--
-- 3) auth.uid() faz parse de JSON a cada chamada; sem envolver em
--    (select ...) era avaliado por linha em vez de uma vez por consulta.
--
-- Nada aqui altera dados nem o que cada pessoa pode ver: as regras de
-- visibilidade continuam identicas, so mudou a forma de calcula-las.
-- =============================================================================

-- 1) auth.uid() uma vez por consulta (InitPlan), nao por linha.
create or replace function public.is_couple_member(p_couple uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = p_couple and profile_id = (select auth.uid())
  );
$$;

create or replace function public.can_see_account(p_account uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.accounts a
    where a.id = p_account
      and public.is_couple_member(a.couple_id)
      and (not a.is_private or a.owner_profile_id = (select auth.uid()))
  );
$$;

drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts for select using (
  public.is_couple_member(couple_id)
  and (not is_private or owner_profile_id = (select auth.uid()))
);

-- 2) Policy de transactions sem chamada de funcao por linha.
--    A subconsulta nao e correlacionada: resolve uma vez e vira lookup em
--    hash. `accounts` ja tem RLS propria, entao o conjunto retornado e
--    exatamente o que can_see_account autorizava - mesma semantica.
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions for select
  using (account_id in (select id from public.accounts));

-- 3) Pre-agrega os movimentos por conta antes do join, matando o loops=7.
create or replace view public.account_balances
with (security_invoker = on) as
  select a.id as account_id,
         a.couple_id,
         a.currency,
         a.initial_balance_cents + coalesce(m.delta_cents, 0) as balance_cents,
         round(
           (a.initial_balance_cents + coalesce(m.delta_cents, 0))
           * coalesce((
               select r.rate from public.exchange_rates r
               join public.couples c on c.id = a.couple_id
               where r.base = a.currency and r.quote = c.primary_currency
               order by r.day desc limit 1
             ), 1)
         )::bigint as balance_primary_cents
  from public.accounts a
  left join (
    select account_id, sum(delta_cents) as delta_cents
    from public.transaction_movements
    group by account_id
  ) m on m.account_id = a.id;

-- A view foi recriada: garante de novo a permissao de leitura.
grant select on public.account_balances to authenticated;
grant select on public.transaction_movements to authenticated;
grant select on public.split_ledger to authenticated;

notify pgrst, 'reload schema';

-- =============================================================================
-- Conferencia: deve voltar rapido (dezenas de ms, nao 8s) e com os valores
-- reais. Rode como authenticated para simular o app - troque o sub pelo seu
-- id de auth.users se quiser repetir para outra pessoa.
-- =============================================================================
-- set local role authenticated;
-- set local request.jwt.claims = '{"sub": "SEU_USER_ID", "role": "authenticated"}';
-- explain (analyze, buffers) select * from public.account_balances;
