-- Corrige 7 transações do Revolut do Gabriel (Trading 212 / Interactive
-- Brokers) que estavam em categorias de resultado real (Outras despesas,
-- Outras receitas, Reembolso) — pela própria regra já documentada em
-- docs/dados-revolut.md ("Sempre transferência, nunca despesa: ... To
-- IBKR, Trading 212"), essas linhas deveriam ser "Transferências internas"
-- como o resto das transferências pra investimento externo. O Gabriel não
-- tem Trading 212/IBKR importados como conta própria neste app — só o
-- dinheiro saindo/voltando do Revolut é visível, mesmo tratamento que
-- Savings Vault/Flexible Cash Funds já recebem.
--
-- Idempotente: só atualiza quem ainda não está em "Transferências internas".

begin;

update public.transactions t
set category_id = cat.id
from public.accounts a
join public.profiles p on p.id = a.owner_profile_id,
     public.categories cat
where t.account_id = a.id
  and p.display_name ilike 'gabriel%'
  and public.normalize_description(a.name) like '%revolut%'
  and (t.description ilike 'Trading 212%' or t.description ilike '%INTERACTIVE BROKERS%')
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
-- where p.display_name ilike 'gabriel%'
--   and public.normalize_description(a.name) like '%revolut%'
--   and (t.description ilike 'Trading 212%' or t.description ilike '%INTERACTIVE BROKERS%')
--   and c.name <> 'Transferências internas';
