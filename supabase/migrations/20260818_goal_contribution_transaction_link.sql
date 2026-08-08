-- Liga um aporte de meta à transação real que o originou -- mesmo padrão já
-- usado em `settlements.transaction_id` (20260811_settlement_transaction_link.sql).
-- Antes, um aporte era só uma linha manual (goal_id, amount_cents), sem
-- nenhum vínculo com dinheiro de verdade: dava pra registrar um aporte de
-- qualquer valor sem nunca ter movido um centavo entre contas, e não havia
-- como reconciliar contra o extrato -- diferente de Carros e Empréstimos, que
-- já reconciliam contra lançamentos reais.
alter table public.goal_contributions
  add column if not exists transaction_id uuid references public.transactions(id) on delete set null;

notify pgrst, 'reload schema';
