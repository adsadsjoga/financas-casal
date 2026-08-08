-- Achado: lançar uma conta fixa (`fixas`) não tinha nenhuma trava no banco
-- contra duplicação. A tela só calcula "já lançada este mês" na leitura
-- (`fixas/page.tsx`, comparando `recurrence_id` + `occurred_on` dentro do mês
-- corrente) — duplo clique, duas abas abertas ou um retry de rede criava
-- duas transações reais para a mesma conta fixa no mesmo mês, dobrando o
-- gasto sem erro nenhum.
--
-- Índice único funcional: mesmo `recurrence_id` não pode aparecer duas vezes
-- no mesmo mês-calendário de `occurred_on` — replica exatamente a regra que
-- a tela já usa para decidir o que mostrar como pendente.
--
-- Antes de rodar em produção, conferir se já não existe alguma duplicata
-- (não deveria, mas o CREATE UNIQUE INDEX falha se existir):
--
-- select recurrence_id, date_trunc('month', occurred_on::timestamp) as mes, count(*)
-- from public.transactions
-- where recurrence_id is not null
-- group by recurrence_id, date_trunc('month', occurred_on::timestamp)
-- having count(*) > 1;
--
-- `occurred_on` é `date`. Sem o `::timestamp`, o Postgres resolve
-- `date_trunc` para o overload de `timestamptz` (STABLE, depende do timezone
-- da sessão) em vez do overload de `timestamp` (IMMUTABLE) -- e um índice
-- exige função imutável na expressão.

create unique index if not exists recurrences_transactions_month_uidx
  on public.transactions (recurrence_id, date_trunc('month', occurred_on::timestamp))
  where recurrence_id is not null;

notify pgrst, 'reload schema';
