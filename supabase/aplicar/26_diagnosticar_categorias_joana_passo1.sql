-- PASSO 1 — diagnóstico da sincronização de categorias (Revolut da Joana)
-- Lê de public._sync_joana_categorias — rodar depois de 25_criar_staging_categorias.sql
-- e de importar joana_categorias_excel.csv pelo Table Editor.
--
-- Casa cada linha por data + valor + tipo + descrição normalizada como PREFIXO
-- (não por fingerprint: a descrição gravada no banco tem um sufixo
-- '[Categoria original Revolut: ...]' que a planilha não tem).
--
-- Se alguma linha vier como 'categoria não existe no app' o UPDATE do 27_
-- NÃO vai tocar nela (INNER JOIN em categories) — se isso acontecer, é sinal
-- de que CATEGORIA_MAP_REVOLUT no script Python precisa de mais uma entrada.
-- Se vier diferente do que já foi conferido antes, o CSV pode ter subido
-- errado (linha faltando, delimitador, encoding) — parar antes do 27_.

with joana_revolut as (
  select a.id, a.couple_id from public.accounts a
  join public.profiles p on p.id = a.owner_profile_id
  where p.display_name ilike 'joana%' and public.normalize_description(a.name) like '%revolut%'
),
excel as (
  select rowid, occurred_on, tipo, amount_cents, descricao, categoria
  from public._sync_joana_categorias
),
-- LEFT JOIN de propósito: uma linha do Excel sem nenhuma transação
-- correspondente precisa continuar existindo aqui (com transaction_id nulo)
-- pra aparecer como "sem correspondência" no diagnóstico — com INNER JOIN
-- ela simplesmente desaparece do resultado em vez de ser contada. Mesma
-- coisa pro `cat_alvo`: categoria do Excel que não existe em
-- `public.categories` tem que aparecer como problema explícito no
-- diagnóstico, não sumir do UPDATE sem avisar (foi exatamente isso que
-- aconteceu na primeira tentativa, 2026-08-06 — o UPDATE com INNER JOIN
-- em categories ignorava silenciosamente quem não tinha categoria, e o
-- segundo UPDATE zerava needs_review de qualquer jeito).
candidatos_brutos as (
  select e.rowid, e.occurred_on, e.tipo, e.amount_cents, e.descricao, e.categoria,
         t.id as transaction_id, t.needs_review, cat_atual.name as categoria_atual,
         cat_alvo.id as categoria_alvo_id
  from excel e
  cross join joana_revolut jr
  left join public.transactions t
    on t.account_id = jr.id
   and t.occurred_on = e.occurred_on
   and t.amount_cents = e.amount_cents
   and t.type = e.tipo::public.tx_type
   and public.normalize_description(t.description)
       like public.normalize_description(e.descricao) || '%'
  left join public.categories cat_atual on cat_atual.id = t.category_id
  left join public.categories cat_alvo
    on cat_alvo.couple_id = jr.couple_id
   and cat_alvo.name = e.categoria
   and cat_alvo.kind = e.tipo::public.category_kind
),
-- Quantas linhas do Excel (de qualquer rowid) apontaram pra essa mesma
-- transação real — se mais de uma, é ambíguo do lado do banco também.
match_por_transacao as (
  select transaction_id, count(*) as n
  from candidatos_brutos
  where transaction_id is not null
  group by 1
),
-- Por linha do Excel (rowid), soma quantas transações casaram — uma linha
-- do Excel não pode virar duas linhas de resultado só porque foi testada
-- contra as duas contas Revolut candidatas. count(transaction_id), não
-- count(*): ignora as linhas sem match (transaction_id nulo) na contagem.
por_linha as (
  select
    cb.rowid, cb.occurred_on, cb.tipo, cb.amount_cents, cb.descricao, cb.categoria,
    count(cb.transaction_id) as total_matches,
    min(cb.transaction_id::text)::uuid as transaction_id_unico,
    bool_or(coalesce(cb.needs_review, false)) as needs_review,
    max(cb.categoria_atual) as categoria_atual,
    max(mt.n) as max_linhas_por_transacao,
    bool_or(cb.categoria_alvo_id is not null) as categoria_alvo_existe
  from candidatos_brutos cb
  left join match_por_transacao mt on mt.transaction_id = cb.transaction_id
  group by cb.rowid, cb.occurred_on, cb.tipo, cb.amount_cents, cb.descricao, cb.categoria
),
-- Só entra aqui quem casou com exatamente 1 transação, essa transação só
-- foi alvo de 1 linha do Excel (evita recorrência/duplicata), E a
-- categoria alvo existe em public.categories — sem essa última checagem
-- o UPDATE do 27_ (que faz INNER JOIN em categories) ignoraria a linha
-- sem avisar, exatamente o bug encontrado em 2026-08-06.
candidatos as (
  select rowid, occurred_on, tipo, amount_cents, descricao, categoria,
         transaction_id_unico as transaction_id, needs_review, categoria_atual
  from por_linha
  where total_matches = 1 and max_linhas_por_transacao = 1 and categoria_alvo_existe
)
select
  case
    when total_matches = 0 then 'sem correspondência'
    when total_matches > 1 or max_linhas_por_transacao > 1
      then 'correspondência ambígua (recorrência ou duplicata)'
    when not categoria_alvo_existe then 'categoria não existe no app'
    when not needs_review and categoria_atual is distinct from categoria
      then 'será atualizada (já revisada, categoria diverge)'
    when categoria_atual is not distinct from categoria then 'já está correto'
    else 'será atualizada'
  end as situacao,
  count(*) as linhas,
  (array_agg(descricao order by occurred_on))[1:5] as exemplos
from por_linha
group by 1
order by 1;
