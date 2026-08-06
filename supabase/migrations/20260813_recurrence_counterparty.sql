-- Liga uma conta fixa a quem ela é paga (senhorio, empresa de luz, etc.) —
-- antes só dava pra saber "pago a quem" catando a descrição do lançamento
-- gerado, sem nenhum vínculo de verdade com a contraparte.
alter table public.recurrences
  add column if not exists counterparty_id uuid references public.counterparties(id) on delete set null;

notify pgrst, 'reload schema';
