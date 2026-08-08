-- Achado: `unique (loan_id, transaction_id)` só impede vincular o MESMO
-- lançamento duas vezes ao MESMO empréstimo. Nada impedia vincular o mesmo
-- lançamento a dois empréstimos diferentes (ex.: uma transferência de 500€
-- marcada como devolução do Empréstimo A e, depois, do Empréstimo B — os
-- dois apareceriam quitados pelo mesmo dinheiro).
--
-- Um lançamento real só pode financiar/quitar um empréstimo por vez, então a
-- unicidade certa é por transaction_id sozinho.
--
-- Antes de rodar em produção, conferir se já não existe alguma duplicata
-- (não deveria, mas o ALTER falha se existir):
--
-- select transaction_id, count(*) from public.loan_transaction_links
-- group by transaction_id having count(*) > 1;

alter table public.loan_transaction_links
  drop constraint if exists loan_transaction_links_loan_id_transaction_id_key;

alter table public.loan_transaction_links
  add constraint loan_transaction_links_transaction_id_key unique (transaction_id);

notify pgrst, 'reload schema';
