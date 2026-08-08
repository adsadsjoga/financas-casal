-- Achado: a policy de SELECT em `loan_transaction_links` só checava
-- `is_couple_member(couple_id)`, sem passar por `can_see_transaction` --
-- diferente da policy de INSERT (20260814_loans_e_fix_rls.sql), que já usa
-- `can_see_transaction` corretamente. O conteúdo da transação em si continua
-- protegido pela RLS de `transactions`, mas o parceiro conseguia ver, via
-- `loan_transaction_links`, que existe um vínculo apontando para um
-- `transaction_id` específico -- mesmo quando essa transação pertence a uma
-- conta marcada `is_private` e ele não deveria nem saber que ela existe.

drop policy if exists loan_links_select on public.loan_transaction_links;
create policy loan_links_select on public.loan_transaction_links for select
  using (public.is_couple_member(couple_id) and public.can_see_transaction(transaction_id));

-- Mesmo gap, mesma tabela-molde: `vehicle_transaction_links` (carros) tem a
-- policy de INSERT correta (20260802_carros.sql) mas o SELECT nunca checou
-- can_see_transaction.
drop policy if exists vehicle_links_select on public.vehicle_transaction_links;
create policy vehicle_links_select on public.vehicle_transaction_links for select
  using (public.is_couple_member(couple_id) and public.can_see_transaction(transaction_id));

notify pgrst, 'reload schema';
