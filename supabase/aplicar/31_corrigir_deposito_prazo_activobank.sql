-- Corrige a categoria de 1 transação: a constituição do Depósito a Prazo
-- do ActivoBank (-9.000 €, 2026-01-23, external_id ACT-20260123-006) foi
-- importada em 30_ como "Transferências internas" (giro entre carteiras),
-- mas é investimento de verdade — dinheiro comprometido num produto, mesmo
-- tratamento já dado às compras de investimento do Trading 212. Os juros
-- (ACT-20260423-051, ACT-20260722-071) e o imposto sobre eles
-- (ACT-20260423-052, ACT-20260722-072) já entraram certos ("Rendimentos" e
-- "Investimentos" respectivamente) — só esta linha precisa de correção.
--
-- Idempotente: só atualiza se a categoria ainda não for "Investimentos".

begin;

update public.transactions t
set category_id = cat.id
from public.accounts a
join public.profiles p on p.id = a.owner_profile_id,
     public.categories cat
where t.account_id = a.id
  and p.display_name ilike 'joana%'
  and a.name = 'ActivoBank'
  and t.external_id = 'ACT-20260123-006'
  and cat.couple_id = t.couple_id
  and cat.name = 'Investimentos'
  and cat.kind = 'despesa'
  and t.category_id is distinct from cat.id;

commit;

-- Conferência depois de rodar (deve mostrar 'Investimentos'):
-- select t.description, t.amount_cents/100.0, c.name
-- from public.transactions t
-- join public.categories c on c.id = t.category_id
-- where t.external_id = 'ACT-20260123-006';
