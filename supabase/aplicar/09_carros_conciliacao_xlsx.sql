-- ALTERA DADOS. Rodar depois de 07_ (diagnostico) e 08_ (categorias).
-- Seguro para rodar mais de uma vez: todo insert usa NOT EXISTS/ON CONFLICT
-- e todo update e idempotente.
--
-- Concilia o modulo de carros com o Excel
-- (centralizador_financeiro_com_carros_antigos_e_pendencias.xlsx, 2026-08-05),
-- abas "Carros Consolidado" e "Carros Antigos".
--
-- O Excel vence nos numeros: ele foi reconciliado contra o extrato real e
-- achou custos bancarios que o Auto Tally (fonte do seed original) nao tinha.
-- Decisao do Gabriel em 2026-08-05.
--
-- O QUE MUDA
--   1. ix35: make 'Honda' -> 'Hyundai' (Honda nao fabrica ix35).
--   2. Nissan Qashqai 2011: compra 1350 -> 1200, com data 2026-01-11.
--   3. +404,12 EUR de custos achados no extrato, distribuidos em 5 carros.
--   4. Vinculo da compra do Qashqai 2011 (MARTIN SAMAGLO), hoje solta.
--   5. Os 8 veiculos de 2025 da aba "Carros Antigos", que nao existiam aqui.
--   6. Vinculo das 5 compras desses carros que ja estao em `transactions`.
--
-- Conferido em 07_ (query 4): as 6 transacoes-ancora (a compra do Qashqai
-- 2011 + as 5 compras dos carros antigos) existem, sao unicas, batem valor e
-- data exatos, e nenhuma tinha vinculo ainda. Todas estavam classificadas
-- como "Transferencias internas" — ou seja, ja estavam sendo EXCLUIDAS do
-- resultado do dashboard como se fossem giro entre bolsos do casal, quando na
-- verdade sao gasto real do negocio de carros. Este script corrige isso:
-- depois de vincular e reclassificar para 'Carro', elas passam a aparecer no
-- modulo de carros em vez de sumir silenciosamente do resultado pessoal.
--
-- O QUE NAO MUDA, DE PROPOSITO
--   - Datas de compra/venda dos 5 carros em que app e Excel concordam no
--     preco. Elas foram confirmadas em docs/carros.md batendo o lucro por mes
--     de venda, e a coluna "Data venda" do Excel tem pelo menos uma linha
--     suspeita (Qashqai 2010 com venda no mesmo dia da compra).
--   - As parcelas do Danilo. Ver PENDENCIA no fim do arquivo.

-- Tudo numa transacao so: se qualquer passo falhar, nada fica gravado pela
-- metade. As consultas de conferencia ficam depois do commit.
begin;

do $$
declare
  v_couple uuid;
  v_count int;
  v_cat_carro uuid;
  v_veiculo uuid;
  v_tx uuid;
begin
  select count(*) into v_count from public.couples;
  if v_count <> 1 then
    raise exception 'Esperava exatamente 1 casal cadastrado, encontrei %.', v_count;
  end if;
  select id into v_couple from public.couples limit 1;

  -- Categoria de despesa de carro, se existir. Usada so para reclassificar as
  -- compras que hoje estao em "Outras despesas". Se nao existir, o script
  -- segue e apenas nao reclassifica.
  select id into v_cat_carro
  from public.categories
  where couple_id = v_couple and kind = 'despesa'
    and public.normalize_description(name) = 'carro'
    and not archived
  limit 1;

  -- =========================================================================
  -- 1. ix35 e Hyundai, nao Honda
  -- =========================================================================
  update public.vehicles
  set make = 'Hyundai'
  where couple_id = v_couple
    and public.normalize_description(model) = 'ix35'
    and make <> 'Hyundai';

  -- =========================================================================
  -- 2. Nissan Qashqai 2011: compra 1350 -> 1200
  -- =========================================================================
  -- O Excel achou a compra no extrato: 2026-01-11, EUR 1.200, "Transfer to
  -- MARTIN SAMAGLO" (GREV-04359). Isso tambem fecha a pendencia manual nº 1
  -- do HANDOFF_CLAUDE_CONCILIACAO.md, que tratava essa saida como par de
  -- transferencia entre pessoas — nao era, e compra de carro. O Jakson que
  -- aparecia do outro lado do "par" e o comprador do Renault Fluence.
  select id into v_veiculo
  from public.vehicles
  where couple_id = v_couple
    and make = 'Nissan' and model = 'Qashqai' and year = 2011
  limit 1;

  if v_veiculo is null then
    raise exception 'Nissan Qashqai 2011 nao encontrado — rode o seed dos carros antes.';
  end if;

  update public.vehicles
  set purchase_price_cents = 120000,
      purchase_date = date '2026-01-11'
  where id = v_veiculo
    and purchase_price_cents <> 120000;

  -- Vincula a transacao da compra e reclassifica para Carro.
  select t.id into v_tx
  from public.transactions t
  where t.couple_id = v_couple
    and t.type = 'despesa'
    and t.amount_cents = 120000
    and t.occurred_on = date '2026-01-11'
    and public.normalize_description(t.description) like '%martin samaglo%'
  limit 1;

  if v_tx is null then
    raise warning 'Compra do Qashqai 2011 (MARTIN SAMAGLO 1200 em 2026-01-11) nao encontrada — vinculo nao criado.';
  else
    insert into public.vehicle_transaction_links (couple_id, vehicle_id, transaction_id, role)
    values (v_couple, v_veiculo, v_tx, 'compra')
    on conflict (vehicle_id, transaction_id, role) do nothing;

    if v_cat_carro is not null then
      update public.transactions
      set category_id = v_cat_carro, needs_review = false
      where id = v_tx;
    end if;
  end if;
end $$;

-- ===========================================================================
-- 3. Custos achados no extrato (+404,12 EUR no total)
-- ===========================================================================
-- O Excel consolida o custo por carro sem detalhar item a item, entao a
-- diferenca entra como UMA linha de ajuste por carro, com a origem declarada
-- na descricao. Inventar itens que a planilha nao tem seria pior que assumir
-- o ajuste.
--
--   Qashqai 2010   0,00 -> 67,85   (+67,85)
--   Ford Ka 2010   0,00 -> 116,34  (+116,34)
--   Ford Focus     592,66 -> 634,71 (+42,05)
--   Qashqai 2011   64,74 -> 211,53 (+146,79)
--   Opel Corsa     518,60 -> 549,69 (+31,09)
--   Hyundai ix35   1302,40 (sem diferenca)
--
-- A data usada e a da venda do carro (ou a da compra, se nao houver venda) —
-- neutra e dentro da vida do veiculo.

insert into public.vehicle_costs (couple_id, vehicle_id, category, description, amount_cents, occurred_on)
select
  v.couple_id,
  v.id,
  'Outro',
  'Ajuste de conciliacao com o extrato (planilha 2026-08-05)',
  d.delta_cents,
  coalesce(v.sale_date, v.purchase_date)
from public.vehicles v
join (values
  ('Nissan', 'Qashqai', 2010,  6785),
  ('Ford',   'Ka',      2010, 11634),
  ('Ford',   'Focus',   2010,  4205),
  ('Nissan', 'Qashqai', 2011, 14679),
  ('Opel',   'Corsa',   2010,  3109)
) as d(make, model, ano, delta_cents)
  on d.make = v.make and d.model = v.model and d.ano = v.year
where not exists (
  select 1 from public.vehicle_costs vc
  where vc.vehicle_id = v.id
    and vc.description = 'Ajuste de conciliacao com o extrato (planilha 2026-08-05)'
);

-- ===========================================================================
-- 4. Os 8 veiculos de 2025 que faltavam
-- ===========================================================================
-- Aba "Carros Antigos". Quatro tem venda com data comprovada no extrato — a
-- data usada e a do primeiro pagamento do comprador, listado na aba "Q3
-- Entradas Carros". Os outros quatro entram como `estoque`, NAO como
-- vendidos: a constraint `vehicles_sale_shape` exige preco e data de venda, e
-- inventar uma data so para satisfazer constraint e exatamente o erro do
-- "ajuste de EUR 47" que ja aconteceu neste projeto. O que se sabe da venda
-- deles fica na nota.

insert into public.vehicles (
  couple_id, status, make, model, year, color,
  purchase_price_cents, purchase_date,
  sale_price_cents, sale_date, buyer_name, notes
)
select
  c.id, v.status, v.make, v.model, v.ano, v.cor,
  v.compra_cents, v.data_compra,
  v.venda_cents, v.data_venda, v.comprador, v.nota
from public.couples c
cross join (values
  -- VENDIDOS (data = primeiro pagamento do comprador no Revolut)
  ('vendido', 'Ford', 'Fiesta', null::smallint, 'marrom',
   55000, date '2025-06-01', 160000, date '2025-06-04', 'Jesus Domingo Miguel Casanova',
   'Carro antigo, aba "Carros Antigos" da planilha 2026-08-05. Vendedor: Maria Zoraida Cano Gonzalez. Venda a vista por transferencia (GREV-03092, 1600). Confianca: Alta.'),

  ('vendido', 'Mitsubishi', 'Lancer', null::smallint, '',
   170000, date '2025-11-24', 275000, date '2025-12-14', 'Nauan Cabrini',
   'Carro antigo, planilha 2026-08-05. Vendedor: Mindaugas Paskevicius. Venda por transferencia (GREV-04212, 2750). Os 15 EUR de GREV-04213 sao reembolso de comboio, nao entram na venda. Confianca: Alta.'),

  ('vendido', 'Volkswagen', 'Polo', null::smallint, 'azul',
   90000, date '2025-06-10', 190000, date '2025-07-24', 'Maycon William Alves Barbosa',
   'Carro antigo, planilha 2026-08-05. Venda: 700 em dinheiro + 12 parcelas de 100 (GREV-03356 a GREV-03832, 1200 no banco). DATA DE COMPRA INFERIDA dos saques de 600 em 26/05 e 300 em 10/06/2025 que somam 900 — confirmar. Confianca: Media.'),

  ('vendido', 'Renault', 'Fluence', null::smallint, '',
   120000, date '2026-01-25', 290000, date '2026-01-25', 'Jakson de Souza Santos',
   'Carro antigo, planilha 2026-08-05. Venda: 1200 de entrada (GREV-04441) + 7 parcelas de 200 + 300 final = 2900. DATA DE COMPRA DESCONHECIDA — usada a data da entrada como marcador, corrigir quando souber. Confianca: Alta na venda.'),

  -- SEM VENDA CONFIRMADA — ficam em estoque de proposito
  ('estoque', 'Opel', 'Corsa', 2009, '',
   130000, date '2025-02-09', null::bigint, null::date, '',
   'Carro antigo, planilha 2026-08-05. Vendedor: Margaret Pauline Sutton (GREV-02622, 1300). Compra financiada com 1000 emprestados do Rezende + 300 proprios; emprestimo quitado com 50 adicionais. VENDA A LOCALIZAR — recebida em dinheiro. CANDIDATO: Patrick Dacio Ferreira pagou 1300 em 2025-02-09 13:58, um minuto ANTES da saida para a Margaret, e 2475 no total ate abril. Confirmar antes de lancar. Confianca: Media.'),

  ('estoque', 'Renault', 'Clio', null::smallint, '',
   128000, date '2025-08-23', null::bigint, null::date, '',
   'Carro antigo, planilha 2026-08-05. Vendedor: Darra O''Connell (GREV-03547, 1280). VENDA A LOCALIZAR. Custo de mecanico de ~300 tambem nao localizado. Confianca: Media.'),

  ('estoque', 'Mitsubishi', 'Swift', null::smallint, '',
   120000, date '2025-09-24', null::bigint, null::date, '',
   'Carro antigo, planilha 2026-08-05. Vendedor: Estefania Torres Esquivel (GREV-03756, 1200). Venda parcelada, comprador e parcelas pendentes; a planilha estimou 2300-2500 e usou 2400 so para controlo — NAO lancado aqui por ser estimativa. Ver tambem o deposito de 1000 com descricao CAR no AIB em 24/09/2025. Nome do modelo conforme a planilha; Swift e modelo Suzuki, confirmar. Confianca: Baixa.'),

  ('estoque', 'Ford', 'Fiesta', null::smallint, 'vermelho',
   95000, date '2026-03-12', null::bigint, null::date, '',
   'Carro antigo, planilha 2026-08-05. Compra: retirada de 950 do cofre Carros em 12/03/2026. Comprador informado por memoria: Matheus Vinhas, 1900 parcelados pela Wise — NENHUM Matheus/Vinhas aparece nos extratos importados, falta subir o extrato Wise. Venda nao lancada por falta de comprovacao. Confianca: Media.')
) as v(status, make, model, ano, cor, compra_cents, data_compra, venda_cents, data_venda, comprador, nota)
where not exists (
  select 1 from public.vehicles ex
  where ex.couple_id = c.id
    and ex.make = v.make
    and ex.model = v.model
    and ex.purchase_price_cents = v.compra_cents
);

-- Custos conhecidos dos carros antigos.
insert into public.vehicle_costs (couple_id, vehicle_id, category, description, amount_cents, occurred_on)
select veic.couple_id, veic.id, d.categoria, d.descricao, d.valor_cents, veic.purchase_date
from (values
  ('Opel',    'Corsa', 130000, 'Outro',    'Emprestimo do Rezende quitado com 50 adicionais (planilha 2026-08-05)',  5000),
  ('Renault', 'Clio',  128000, 'Mecânica', 'Mecanico aproximado, valor nao localizado no extrato (planilha 2026-08-05)', 30000)
) as d(make, model, compra_cents, categoria, descricao, valor_cents)
join public.vehicles veic
  on veic.make = d.make and veic.model = d.model
 and veic.purchase_price_cents = d.compra_cents
where not exists (
  select 1 from public.vehicle_costs vc
  where vc.vehicle_id = veic.id and vc.description = d.descricao
);

-- ===========================================================================
-- 5. Vincular as compras que ja estao no banco
-- ===========================================================================
-- Cinco das oito compras estao em `transactions` desde a importacao do
-- Revolut, largadas em "Outras despesas" — sao as mesmas linhas que a aba
-- "Q4 Saidas Carros" lista e que "Proximas Categorias" marca como
-- "Identificar finalidade". Casadas por valor exato + janela de 3 dias +
-- nome do vendedor na descricao.

insert into public.vehicle_transaction_links (couple_id, vehicle_id, transaction_id, role)
select distinct on (veic.id) veic.couple_id, veic.id, t.id, 'compra'
from (values
  ('Opel',       'Corsa',   130000, 'margaret pauline sutton',     date '2025-02-09'),
  ('Ford',       'Fiesta',   55000, 'maria zoraida cano gonzalez', date '2025-06-01'),
  ('Renault',    'Clio',    128000, 'darra o connell',             date '2025-08-23'),
  ('Mitsubishi', 'Swift',   120000, 'estefania torres esquivel',   date '2025-09-24'),
  ('Mitsubishi', 'Lancer',  170000, 'mindaugas paskevicius',       date '2025-11-24')
) as d(make, model, compra_cents, vendedor, data_ref)
join public.vehicles veic
  on veic.make = d.make and veic.model = d.model
 and veic.purchase_price_cents = d.compra_cents
join public.transactions t
  on t.couple_id = veic.couple_id
 and t.type = 'despesa'
 and t.amount_cents = d.compra_cents
 and t.occurred_on between d.data_ref - 3 and d.data_ref + 3
 and public.normalize_description(t.description) like '%' || d.vendedor || '%'
order by veic.id, t.occurred_on
on conflict (vehicle_id, transaction_id, role) do nothing;

-- Reclassifica para "Carro" tudo que acabou de virar compra de veiculo.
update public.transactions t
set category_id = c.id, needs_review = false
from public.categories c, public.vehicle_transaction_links vl
where vl.transaction_id = t.id
  and vl.role = 'compra'
  and c.couple_id = t.couple_id
  and c.kind = 'despesa'
  and public.normalize_description(c.name) = 'carro'
  and not c.archived
  and t.category_id is distinct from c.id;

commit;

-- ===========================================================================
-- CONFERENCIA — rodar depois do commit
-- ===========================================================================
-- 1. Os 6 carros do "Carros Consolidado" tem que bater com a planilha:
--    compras 9.150 | custos 2.882,52 | vendas 19.250 | lucro 7.217,48
select
  v.make || ' ' || v.model || coalesce(' ' || v.year, '') as veiculo,
  v.status,
  v.purchase_price_cents / 100.0 as compra,
  coalesce(sum(vc.amount_cents), 0) / 100.0 as custos,
  coalesce(v.sale_price_cents, 0) / 100.0 as venda,
  (coalesce(v.sale_price_cents, 0) - v.purchase_price_cents
     - coalesce(sum(vc.amount_cents), 0)) / 100.0 as lucro,
  count(distinct vl.id) as vinculos
from public.vehicles v
left join public.vehicle_costs vc on vc.vehicle_id = v.id
left join public.vehicle_transaction_links vl on vl.vehicle_id = v.id
-- Os 8 carros antigos carregam esse marcador na nota; sobram os 6 originais.
-- Filtrar por data nao serviria: Fluence e Fiesta vermelho tambem sao de 2026.
where v.notes not like 'Carro antigo,%'
group by v.id
order by v.purchase_date;

-- 2. Total geral, os 14 veiculos.
select
  count(*) filter (where status = 'vendido') as vendidos,
  count(*) filter (where status = 'estoque') as em_estoque,
  sum(purchase_price_cents) / 100.0 as compras,
  sum(coalesce(sale_price_cents, 0)) / 100.0 as vendas
from public.vehicles;

-- 3. As compras que ficaram sem vinculo — devem ser so as 3 que a planilha
--    tambem nao achou (Polo, Fluence, Fiesta vermelho) mais as que sairam em
--    dinheiro (Opel Corsa 2010 e, antes deste script, Qashqai 2011).
select
  v.make || ' ' || v.model || coalesce(' ' || v.year, '') as veiculo,
  v.purchase_price_cents / 100.0 as compra,
  v.purchase_date
from public.vehicles v
where not exists (
  select 1 from public.vehicle_transaction_links vl
  where vl.vehicle_id = v.id and vl.role = 'compra'
)
order by v.purchase_date;

-- ===========================================================================
-- PENDENCIAS QUE ESTE SCRIPT NAO RESOLVE (dependem do Gabriel)
-- ===========================================================================
-- 1. Danilo / Nissan Qashqai 2011: o cronograma no app diz 200 a receber
--    (entrada 1000 + 12x200), a reconciliacao bancaria da planilha diz 250.
--    A propria planilha registra isso como conflito entre dois controles, nao
--    como fato. NAO foi forcado aqui — mexer no cronograma para o saldo bater
--    e o mesmo erro do "ajuste de EUR 47". Conferir e ajustar pelo app.
--
-- 2. Opel Corsa 2009: confirmar se Patrick Dacio Ferreira e o comprador
--    (2.475 em 3 pagamentos a partir de 2025-02-09, o primeiro um minuto
--    antes da compra). Se sim, mudar status para 'vendido' e vincular.
--
-- 3. Renault Clio, Mitsubishi Swift, Ford Fiesta vermelho: venda a localizar.
--    O Fiesta vermelho depende de subir o extrato Wise.
--
-- 4. Compras do Volkswagen Polo, Renault Fluence e Ford Fiesta vermelho:
--    sairam em dinheiro, sem transacao para vincular.
--
-- 5. Recebido em dinheiro (4.900 EUR na planilha) nao esta modelado. Precisa
--    da conta "Dinheiro em maos" descrita em docs/carros.md, que nao existe.
