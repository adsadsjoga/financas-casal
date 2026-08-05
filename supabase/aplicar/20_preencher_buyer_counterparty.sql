-- ALTERA DADOS. Idempotente — só preenche onde buyer_counterparty_id ainda
-- é nulo e existe exatamente 1 match.
--
-- Rodar depois de 19_migration_conta_comprador_e_projetos.sql (cria a
-- coluna). Casa `vehicles.buyer_name` com `counterparties.name` ou algum
-- `counterparty_aliases.pattern`, mesmo mecanismo de matching que
-- `/pessoas` já usa (substring na descrição normalizada) — aqui aplicado ao
-- nome do comprador em vez de descrição de transação.

-- ---------------------------------------------------------------------------
-- 1. Diagnóstico — nao altera nada. Mostra o match encontrado (ou None) pra
--    cada veículo vendido com comprador, antes de decidir.
-- ---------------------------------------------------------------------------
with candidatos as (
  select
    v.id as vehicle_id,
    v.make, v.model, v.year, v.buyer_name,
    c.id as counterparty_id,
    c.name as counterparty_name,
    -- match pelo nome inteiro da contraparte OU por algum alias dela
    (
      public.normalize_description(v.buyer_name) = public.normalize_description(c.name)
      or exists (
        select 1 from public.counterparty_aliases ca
        where ca.counterparty_id = c.id
          and (
            public.normalize_description(v.buyer_name) like '%' || ca.pattern || '%'
            or ca.pattern like '%' || public.normalize_description(v.buyer_name) || '%'
          )
      )
    ) as bate
  from public.vehicles v
  join public.counterparties c on c.couple_id = v.couple_id and not c.archived
  where v.buyer_name <> '' and v.buyer_counterparty_id is null
)
select
  vehicle_id, make, model, year, buyer_name,
  count(*) filter (where bate) as matches,
  string_agg(counterparty_name, ' | ') filter (where bate) as candidatas
from candidatos
group by vehicle_id, make, model, year, buyer_name
order by matches desc, make;

-- ---------------------------------------------------------------------------
-- 2. Preenche só quando há exatamente 1 match — ambíguo fica de fora,
--    aparece na conferência 3 pra decisão manual.
-- ---------------------------------------------------------------------------
with candidatos as (
  select
    v.id as vehicle_id,
    c.id as counterparty_id,
    (
      public.normalize_description(v.buyer_name) = public.normalize_description(c.name)
      or exists (
        select 1 from public.counterparty_aliases ca
        where ca.counterparty_id = c.id
          and (
            public.normalize_description(v.buyer_name) like '%' || ca.pattern || '%'
            or ca.pattern like '%' || public.normalize_description(v.buyer_name) || '%'
          )
      )
    ) as bate
  from public.vehicles v
  join public.counterparties c on c.couple_id = v.couple_id and not c.archived
  where v.buyer_name <> '' and v.buyer_counterparty_id is null
),
unicos as (
  -- array_agg + [1], nao min(): Postgres nao tem agregado min() para uuid.
  -- Como o `having count(*) = 1` garante uma linha so, pegar o primeiro
  -- elemento e o mesmo que pegar "o unico".
  select vehicle_id, (array_agg(counterparty_id))[1] as counterparty_id
  from candidatos
  where bate
  group by vehicle_id
  having count(*) = 1
)
update public.vehicles v
set buyer_counterparty_id = u.counterparty_id
from unicos u
where v.id = u.vehicle_id;

-- ---------------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------------
-- 3. Veículos com comprador digitado que ainda ficaram sem contraparte —
--    ou não achou nenhuma, ou achou mais de uma (ambíguo). Decisão manual
--    pela tela do carro (o combobox de comprador aceita cadastrar depois).
select
  v.make, v.model, v.year, v.buyer_name
from public.vehicles v
where v.buyer_name <> '' and v.buyer_counterparty_id is null
order by v.purchase_date;

-- 4. Os que ficaram preenchidos.
select
  v.make || ' ' || v.model || coalesce(' ' || v.year, '') as veiculo,
  v.buyer_name,
  c.name as contraparte_vinculada
from public.vehicles v
join public.counterparties c on c.id = v.buyer_counterparty_id
order by v.purchase_date;
