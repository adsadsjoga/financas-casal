-- Antes, `/pessoas` mandava TODAS as transações do casal (potencialmente
-- milhares) como prop pro client, só para filtrar client-side quando alguém
-- clicava "Ver lançamentos" numa pessoa. Essa função move o filtro pro
-- Postgres — só busca quando a pessoa é aberta, só as linhas dela.
create or replace function public.transacoes_por_contraparte(
  p_couple_id uuid,
  p_counterparty_id uuid,
  p_desde date default null,
  p_ate date default null
)
returns setof public.transactions
language sql
stable
as $$
  select t.*
  from public.transactions t
  where t.couple_id = p_couple_id
    and t.type in ('receita', 'despesa')
    and (p_desde is null or t.occurred_on >= p_desde)
    and (p_ate is null or t.occurred_on < p_ate)
    and exists (
      select 1
      from public.counterparty_aliases a
      where a.counterparty_id = p_counterparty_id
        and public.normalize_description(t.description) like '%' || a.pattern || '%'
    )
  order by t.occurred_on desc;
$$;

notify pgrst, 'reload schema';
