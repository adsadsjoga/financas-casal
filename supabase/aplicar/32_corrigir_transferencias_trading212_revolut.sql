-- Corrige a categoria de transações do Revolut da Joana que financiam a
-- conta Trading 212 ("To investment account", "Trading 212") — estavam
-- categorizadas "Investimentos", mas são transferência patrimonial (o
-- dinheiro sai do Revolut pra dentro do Trading 212, onde a COMPRA de
-- verdade já é contada separadamente via 29_). Contar as duas pontas como
-- "Investimentos" dobra o valor aportado.
--
-- Achado ao investigar por que a tela /investimentos mostrava lançamentos
-- "Não identificado" mesmo depois do fix de identificarAtivo() (que só
-- resolve o lado Trading 212/ActivoBank, não a origem do dinheiro no
-- Revolut). Mesmo princípio já usado pra CGD-Revolut e pro "Deposit" que
-- já entrou certo dentro do próprio Trading 212 (categoria "Transferência
-- interna — Trading 212" -> "Transferências internas").
--
-- Idempotente: só atualiza quem ainda está com a categoria errada.

begin;

update public.transactions t
set category_id = cat.id
from public.accounts a
join public.profiles p on p.id = a.owner_profile_id,
     public.categories cat
where t.account_id = a.id
  and p.display_name ilike 'joana%'
  and public.normalize_description(a.name) like '%revolut%'
  and (t.description ilike 'To investment account%' or t.description ilike 'Trading 212%')
  and cat.couple_id = t.couple_id
  and cat.name = 'Transferências internas'
  and cat.kind::text = t.type::text
  and t.category_id is distinct from cat.id;

commit;

-- Conferência depois de rodar (deve vir 0 linhas):
-- select t.description, t.amount_cents/100.0, c.name
-- from public.transactions t
-- join public.accounts a on a.id = t.account_id
-- join public.profiles p on p.id = a.owner_profile_id
-- join public.categories c on c.id = t.category_id
-- where p.display_name ilike 'joana%'
--   and public.normalize_description(a.name) like '%revolut%'
--   and (t.description ilike 'To investment account%' or t.description ilike 'Trading 212%')
--   and c.name <> 'Transferências internas';
