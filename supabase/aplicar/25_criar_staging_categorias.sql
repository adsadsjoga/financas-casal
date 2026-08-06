-- Tabela solta, fora do schema de produção, só para a importação do CSV
-- gerado por scripts/gerar_import_cgd_joana.py --modo categorias-csv.
-- Sem RLS de propósito — é staging, não dado do app; apagada em
-- 28_limpar_staging_categorias.sql depois de confirmar o 27_.
create table if not exists public._sync_joana_categorias (
  rowid int primary key,
  occurred_on date not null,
  tipo text not null,
  amount_cents bigint not null,
  descricao text not null,
  categoria text not null
);

truncate public._sync_joana_categorias;

-- Depois de rodar isto: Table Editor -> _sync_joana_categorias -> Insert ->
-- Import data from CSV -> escolher joana_categorias_excel.csv.
