-- Divisão não-50/50 numa conta fixa (ex.: Vodafone sempre 70/30, não meio a
-- meio). `custom_split` guarda o percentual de cada pessoa (profile_id ->
-- 0..100, soma 100) — não centavos, porque uma recorrente "variavel" muda de
-- valor todo mês; o percentual é recalculado em cima do valor lançado.
alter table public.recurrences
  add column if not exists custom_split jsonb;

notify pgrst, 'reload schema';
