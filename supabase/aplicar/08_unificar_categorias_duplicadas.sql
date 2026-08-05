-- ALTERA DADOS. Rodar so depois de conferir o resultado 1 de
-- 07_diagnosticar_conciliacao_xlsx.sql.
--
-- PROBLEMA
-- Existem duas categorias para o mesmo conceito, criadas por scripts
-- diferentes em sessoes diferentes:
--
--   "Transferências internas"  <- subir_revolut_joana_poupanca.sql
--   "Transferencias internas"  <- scripts 02/05/10 de Documents\Contas casal
--
-- `CATEGORIAS_FORA_DO_RESULTADO` (src/lib/constants.ts) compara por igualdade
-- literal e so conhece a grafia com acento. As transacoes da grafia sem acento
-- NAO sao filtradas: entram na Home, nos graficos, no resumo por categoria e
-- no e-mail mensal como se fossem receita/despesa real. Pelos exports do app
-- sao ~578 linhas, e pelo HANDOFF essa categoria movimenta ~70 mil EUR de
-- cada lado.
--
-- O QUE ESTE SCRIPT FAZ
-- Para cada grupo de categorias com o mesmo nome normalizado (mesmo casal,
-- mesmo kind), elege uma vencedora, repontar tudo que aponta para as outras,
-- e arquiva as perdedoras. NAO apaga categoria (arquiva, para nao perder o
-- historico se algo escapou) e NAO toca em valor, data, tipo ou conta de
-- transacao — so em `category_id`. Mesma regra do
-- HANDOFF_CLAUDE_CONCILIACAO.md.
--
-- Criterio da vencedora, nesta ordem:
--   1. grafia que o app ja trata como fora do resultado (mantem o filtro
--      funcionando mesmo que o deploy do fix em constants.ts venha depois);
--   2. mais transacoes;
--   3. mais antiga.
--
-- Quatro tabelas apontam para categories: transactions, recurrences,
-- import_rules e budgets. As tres primeiras sao repontadas direto. `budgets`
-- tem indice unico em (couple_id, category_id, month, profile_id), entao
-- colisao e possivel — o script repontar so o que nao colide e LISTA o que
-- sobrou para decisao manual, em vez de somar ou descartar orcamento por
-- conta propria.
--
-- SEM TABELA TEMPORARIA DE PROPOSITO. O SQL Editor do Supabase passa pelo
-- pgbouncer em modo transacao: statements do mesmo "run" podem cair em
-- conexoes fisicas diferentes, e tabela temp e escopada a sessao — por isso
-- um `create temp table` seguido de `update` em outro statement pode dar
-- "relation does not exist". A mesma CTE `merge_categorias` e repetida em
-- cada statement porque CTE nao atravessa `;` nem depende de sessao.

-- Antes: o que vai mudar.
with merge_categorias as (
  with grupos as (
    select c.couple_id, c.kind, public.normalize_description(c.name) as nome_normalizado
    from public.categories c
    where not c.archived
    group by 1, 2, 3
    having count(*) > 1
  ),
  membros as (
    select
      c.id, c.couple_id, c.kind, c.name, g.nome_normalizado, c.created_at,
      (select count(*) from public.transactions t where t.category_id = c.id) as transacoes,
      (c.name in ('Transferências internas', 'Saques e dinheiro')) as e_filtrada_hoje
    from grupos g
    join public.categories c
      on c.couple_id = g.couple_id
     and c.kind = g.kind
     and public.normalize_description(c.name) = g.nome_normalizado
    where not c.archived
  ),
  eleicao as (
    select
      m.*,
      first_value(m.id) over (
        partition by m.couple_id, m.kind, m.nome_normalizado
        order by m.e_filtrada_hoje desc, m.transacoes desc, m.created_at asc
      ) as vencedora_id
    from membros m
  )
  select
    e.id as perdedora_id, e.name as perdedora_nome, e.transacoes as perdedora_transacoes,
    e.vencedora_id, v.name as vencedora_nome, e.couple_id, e.kind
  from eleicao e
  join public.categories v on v.id = e.vencedora_id
  where e.id <> e.vencedora_id
)
select kind, perdedora_nome, perdedora_transacoes, vencedora_nome
from merge_categorias
order by kind, perdedora_nome;

-- A partir daqui altera dados. Rodar em sequencia, um statement de cada vez
-- (ou colar tudo de uma vez — o editor do Supabase executa em ordem).

begin;

with merge_categorias as (
  with grupos as (
    select c.couple_id, c.kind, public.normalize_description(c.name) as nome_normalizado
    from public.categories c
    where not c.archived
    group by 1, 2, 3
    having count(*) > 1
  ),
  membros as (
    select
      c.id, c.couple_id, c.kind, c.name, g.nome_normalizado, c.created_at,
      (select count(*) from public.transactions t where t.category_id = c.id) as transacoes,
      (c.name in ('Transferências internas', 'Saques e dinheiro')) as e_filtrada_hoje
    from grupos g
    join public.categories c
      on c.couple_id = g.couple_id
     and c.kind = g.kind
     and public.normalize_description(c.name) = g.nome_normalizado
    where not c.archived
  ),
  eleicao as (
    select
      m.*,
      first_value(m.id) over (
        partition by m.couple_id, m.kind, m.nome_normalizado
        order by m.e_filtrada_hoje desc, m.transacoes desc, m.created_at asc
      ) as vencedora_id
    from membros m
  )
  select
    e.id as perdedora_id, e.name as perdedora_nome, e.transacoes as perdedora_transacoes,
    e.vencedora_id, v.name as vencedora_nome, e.couple_id, e.kind
  from eleicao e
  join public.categories v on v.id = e.vencedora_id
  where e.id <> e.vencedora_id
)
update public.transactions t
set category_id = m.vencedora_id
from merge_categorias m
where t.category_id = m.perdedora_id;

with merge_categorias as (
  with grupos as (
    select c.couple_id, c.kind, public.normalize_description(c.name) as nome_normalizado
    from public.categories c
    where not c.archived
    group by 1, 2, 3
    having count(*) > 1
  ),
  membros as (
    select
      c.id, c.couple_id, c.kind, c.name, g.nome_normalizado, c.created_at,
      (select count(*) from public.transactions t where t.category_id = c.id) as transacoes,
      (c.name in ('Transferências internas', 'Saques e dinheiro')) as e_filtrada_hoje
    from grupos g
    join public.categories c
      on c.couple_id = g.couple_id
     and c.kind = g.kind
     and public.normalize_description(c.name) = g.nome_normalizado
    where not c.archived
  ),
  eleicao as (
    select
      m.*,
      first_value(m.id) over (
        partition by m.couple_id, m.kind, m.nome_normalizado
        order by m.e_filtrada_hoje desc, m.transacoes desc, m.created_at asc
      ) as vencedora_id
    from membros m
  )
  select
    e.id as perdedora_id, e.name as perdedora_nome, e.transacoes as perdedora_transacoes,
    e.vencedora_id, v.name as vencedora_nome, e.couple_id, e.kind
  from eleicao e
  join public.categories v on v.id = e.vencedora_id
  where e.id <> e.vencedora_id
)
update public.recurrences r
set category_id = m.vencedora_id
from merge_categorias m
where r.category_id = m.perdedora_id;

with merge_categorias as (
  with grupos as (
    select c.couple_id, c.kind, public.normalize_description(c.name) as nome_normalizado
    from public.categories c
    where not c.archived
    group by 1, 2, 3
    having count(*) > 1
  ),
  membros as (
    select
      c.id, c.couple_id, c.kind, c.name, g.nome_normalizado, c.created_at,
      (select count(*) from public.transactions t where t.category_id = c.id) as transacoes,
      (c.name in ('Transferências internas', 'Saques e dinheiro')) as e_filtrada_hoje
    from grupos g
    join public.categories c
      on c.couple_id = g.couple_id
     and c.kind = g.kind
     and public.normalize_description(c.name) = g.nome_normalizado
    where not c.archived
  ),
  eleicao as (
    select
      m.*,
      first_value(m.id) over (
        partition by m.couple_id, m.kind, m.nome_normalizado
        order by m.e_filtrada_hoje desc, m.transacoes desc, m.created_at asc
      ) as vencedora_id
    from membros m
  )
  select
    e.id as perdedora_id, e.name as perdedora_nome, e.transacoes as perdedora_transacoes,
    e.vencedora_id, v.name as vencedora_nome, e.couple_id, e.kind
  from eleicao e
  join public.categories v on v.id = e.vencedora_id
  where e.id <> e.vencedora_id
)
update public.import_rules ir
set category_id = m.vencedora_id
from merge_categorias m
where ir.category_id = m.perdedora_id;

-- Orcamento: so o que nao colide com um orcamento ja existente da vencedora
-- para o mesmo mes e a mesma pessoa.
with merge_categorias as (
  with grupos as (
    select c.couple_id, c.kind, public.normalize_description(c.name) as nome_normalizado
    from public.categories c
    where not c.archived
    group by 1, 2, 3
    having count(*) > 1
  ),
  membros as (
    select
      c.id, c.couple_id, c.kind, c.name, g.nome_normalizado, c.created_at,
      (select count(*) from public.transactions t where t.category_id = c.id) as transacoes,
      (c.name in ('Transferências internas', 'Saques e dinheiro')) as e_filtrada_hoje
    from grupos g
    join public.categories c
      on c.couple_id = g.couple_id
     and c.kind = g.kind
     and public.normalize_description(c.name) = g.nome_normalizado
    where not c.archived
  ),
  eleicao as (
    select
      m.*,
      first_value(m.id) over (
        partition by m.couple_id, m.kind, m.nome_normalizado
        order by m.e_filtrada_hoje desc, m.transacoes desc, m.created_at asc
      ) as vencedora_id
    from membros m
  )
  select
    e.id as perdedora_id, e.name as perdedora_nome, e.transacoes as perdedora_transacoes,
    e.vencedora_id, v.name as vencedora_nome, e.couple_id, e.kind
  from eleicao e
  join public.categories v on v.id = e.vencedora_id
  where e.id <> e.vencedora_id
)
update public.budgets b
set category_id = m.vencedora_id
from merge_categorias m
where b.category_id = m.perdedora_id
  and not exists (
    select 1 from public.budgets b2
    where b2.couple_id = b.couple_id
      and b2.category_id = m.vencedora_id
      and b2.month = b.month
      and b2.profile_id is not distinct from b.profile_id
  );

-- Arquiva as perdedoras que ficaram sem nenhuma referencia.
with merge_categorias as (
  with grupos as (
    select c.couple_id, c.kind, public.normalize_description(c.name) as nome_normalizado
    from public.categories c
    where not c.archived
    group by 1, 2, 3
    having count(*) > 1
  ),
  membros as (
    select
      c.id, c.couple_id, c.kind, c.name, g.nome_normalizado, c.created_at,
      (select count(*) from public.transactions t where t.category_id = c.id) as transacoes,
      (c.name in ('Transferências internas', 'Saques e dinheiro')) as e_filtrada_hoje
    from grupos g
    join public.categories c
      on c.couple_id = g.couple_id
     and c.kind = g.kind
     and public.normalize_description(c.name) = g.nome_normalizado
    where not c.archived
  ),
  eleicao as (
    select
      m.*,
      first_value(m.id) over (
        partition by m.couple_id, m.kind, m.nome_normalizado
        order by m.e_filtrada_hoje desc, m.transacoes desc, m.created_at asc
      ) as vencedora_id
    from membros m
  )
  select
    e.id as perdedora_id, e.name as perdedora_nome, e.transacoes as perdedora_transacoes,
    e.vencedora_id, v.name as vencedora_nome, e.couple_id, e.kind
  from eleicao e
  join public.categories v on v.id = e.vencedora_id
  where e.id <> e.vencedora_id
)
update public.categories c
set archived = true
from merge_categorias m
where c.id = m.perdedora_id
  and not exists (select 1 from public.transactions t where t.category_id = c.id)
  and not exists (select 1 from public.recurrences r where r.category_id = c.id)
  and not exists (select 1 from public.import_rules ir where ir.category_id = c.id)
  and not exists (select 1 from public.budgets b where b.category_id = c.id);

commit;

-- ---------------------------------------------------------------------------
-- CONFERENCIA — rodar depois do commit
-- ---------------------------------------------------------------------------
-- 1. Orcamentos que colidiram e ficaram apontando para a categoria perdedora
--    — precisam de decisao manual (somar os dois limites? manter um?). Rodar
--    ANTES do commit acima faria mais sentido, mas depende da mesma CTE que
--    ja rodou; como o merge e idempotente (categorias ja unificadas nao
--    aparecem de novo), rodar depois tambem serve — so que aqui ja not vai
--    achar nada, porque o merge_categorias original nao existe mais depois
--    do commit. Por isso a consulta certa de "o que colidiu" e feita ANTES
--    do commit, no bloco de update de budgets acima: se aquele update mudou
--    menos linhas do que o total de budgets nas perdedoras, sobrou colisao.
--    Verificar direto:
select
  b.id as budget_id, b.month, b.profile_id, b.limit_cents / 100.0 as limite,
  c.name as categoria_ainda_duplicada
from public.budgets b
join public.categories c on c.id = b.category_id
where c.archived = false
  and exists (
    select 1 from public.categories c2
    where c2.couple_id = c.couple_id and c2.kind = c.kind and c2.id <> c.id
      and not c2.archived
      and public.normalize_description(c2.name) = public.normalize_description(c.name)
  );

-- 2. Nao pode sobrar grupo duplicado entre as categorias ativas.
--    Esperado: 0 linhas (a menos que a query 1 acima tenha achado colisao de
--    orcamento — nesse caso a perdedora fica ativa de proposito, ate decidir).
select
  c.kind,
  public.normalize_description(c.name) as nome_normalizado,
  count(*) as grafias_ativas,
  string_agg(c.name, ' | ' order by c.name) as quais
from public.categories c
where not c.archived
group by 1, 2
having count(*) > 1;

-- 3. Quanto ficou concentrado nas categorias que o dashboard exclui.
--    Comparar o total com o que a Home mostrava antes: a queda no resultado
--    mensal e exatamente este dinheiro, que estava entrando indevidamente.
select
  c.name,
  c.kind,
  count(t.id) as transacoes,
  sum(t.amount_primary_cents) / 100.0 as total_moeda_primaria
from public.categories c
join public.transactions t on t.category_id = c.id
where not c.archived
  and c.name in ('Transferências internas', 'Saques e dinheiro')
group by c.name, c.kind
order by c.name, c.kind;
