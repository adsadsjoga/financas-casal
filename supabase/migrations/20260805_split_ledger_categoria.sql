-- Expõe `category_id` no split_ledger para a tela de acerto conseguir mostrar
-- de onde vem a diferença (mercado? aluguel?).
--
-- Aditivo: mesma consulta, mesmo join, uma coluna a mais no select — sem risco
-- de performance (nada de novo join por linha, a armadilha documentada em
-- 20260803_performance_saldos.sql).
--
-- `category_id` vai no FINAL da lista, não entre occurred_on e
-- payer_profile_id: `create or replace view` do Postgres não permite mudar a
-- posição de coluna já existente (erro 42P16, "cannot change name of view
-- column"), só adicionar no fim. Não afeta o app: o Supabase JS lê por nome
-- de coluna, nunca por posição.

create or replace view public.split_ledger
with (security_invoker = on) as
  select t.couple_id,
         t.id as transaction_id,
         t.occurred_on,
         t.payer_profile_id,
         s.profile_id as debtor_profile_id,
         s.share_cents,
         t.category_id
  from public.transactions t
  join public.transaction_splits s on s.transaction_id = t.id
  where t.split_mode <> 'none'
    and t.payer_profile_id is not null
    and s.profile_id <> t.payer_profile_id;

notify pgrst, 'reload schema';
