-- Indice de apoio para as consultas que filtram transacoes por casal + tipo
-- (dashboard e resumo mensal fazem `.eq(couple_id).in(type, [...])`).
--
-- NOTA HONESTA: este indice foi criado durante a investigacao do saldo
-- zerado, com a hipotese de que o timeout vinha de falta de indice. A
-- hipotese estava ERRADA - o EXPLAIN provou depois que a causa era outra
-- (nested loop com loops=7 + funcao de RLS chamada por linha), corrigida em
-- 20260803_performance_saldos.sql. O indice ficou porque ainda ajuda as
-- consultas por couple_id+type, mas nao foi ele que resolveu o problema.

create index if not exists transactions_couple_type_idx
  on public.transactions(couple_id, type);
