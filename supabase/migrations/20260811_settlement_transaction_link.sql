-- Liga um acerto à transação real que o pagou (ex.: o Pix que a Joana
-- mandou pra quitar a Vodafone). Antes só existia nota em texto livre, sem
-- nenhuma referência de verdade — o histórico de acertos não tinha como
-- "provar" com qual lançamento do banco aquilo bateu.
alter table public.settlements
  add column if not exists transaction_id uuid references public.transactions(id) on delete set null;

notify pgrst, 'reload schema';
