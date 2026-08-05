-- ALTERA DADOS. Idempotente: pode rodar mais de uma vez.
--
-- Cria os projetos da aba "Divisões 50-50" do centralizador
-- (planilha 2026-08-05) e vincula as despesas correspondentes.
--
-- O QUE ENTRA NO PROJETO
-- Só a despesa real. As "transferências observadas" da planilha (Joana manda
-- metade para o Gabriel, e vice-versa) NAO entram: elas sao giro entre bolsos
-- do casal, ja classificado como "Transferências internas". Somar as duas
-- pontas faria o projeto custar uma vez e meia o que custou.
--
-- Excecao consciente: o reembolso do seguro (receita de 1.193,86) entra, para
-- o projeto "Seguro automovel" mostrar o custo liquido e nao so o bruto.
--
-- OBSERVACAO sobre "Carros — Hyundai ix35": esse gasto ja e acompanhado pelo
-- modulo de carros, via `vehicle_transaction_links`. O projeto e uma segunda
-- visao da mesma despesa, nao um custo a mais — as duas telas vao mostrar os
-- 3.100. Criado porque a planilha o trata como operacao conjunta do casal
-- (Joana entrou com 1.600), coisa que o modulo de carros nao registra.

begin;

insert into public.projects (couple_id, name, icon)
select c.id, p.nome, p.icone
from public.couples c
cross join (values
  ('Casamento — Søborg/Copenhaga', '💍'),
  ('Seguro automóvel',             '🛡️'),
  ('Carros — Hyundai ix35',        '🚗')
) as p(nome, icone)
on conflict (couple_id, name) do nothing;

-- Vincula por valor exato + janela de 3 dias. A janela existe porque a data
-- da planilha e a da operacao, e o extrato registra a data de conclusao —
-- 1 a 2 dias de diferenca e comum em pagamento de cartao (mesmo motivo
-- documentado em docs/estado-atual.md para a importacao do Revolut).
insert into public.project_transactions (project_id, transaction_id)
select distinct pr.id, t.id
from (values
  ('Casamento — Søborg/Copenhaga', 'despesa', 53823, date '2026-06-10'),  -- câmera
  ('Casamento — Søborg/Copenhaga', 'despesa', 64080, date '2026-06-11'),  -- Airbnb
  ('Casamento — Søborg/Copenhaga', 'despesa', 47500, date '2026-06-26'),  -- maquilhagem
  ('Seguro automóvel',             'despesa', 122061, date '2026-07-06'), -- 123.ie
  ('Seguro automóvel',             'receita', 119386, date '2026-07-16'), -- reembolso 123.ie
  ('Carros — Hyundai ix35',        'despesa', 310000, date '2026-03-22')  -- compra
) as d(projeto, tipo, valor_cents, data_ref)
join public.projects pr on pr.name = d.projeto
join public.transactions t
  on t.couple_id = pr.couple_id
 and t.type::text = d.tipo
 and t.amount_cents = d.valor_cents
 and t.occurred_on between d.data_ref - 3 and d.data_ref + 3
on conflict (project_id, transaction_id) do nothing;

commit;

-- ===========================================================================
-- CONFERENCIA
-- ===========================================================================
-- 1. O que cada projeto ficou custando. Esperado, pela planilha:
--    Casamento — Søborg/Copenhaga: 538,23 + 640,80 + 475,00 = 1.654,03 bruto
--      (Eduardo reembolsou 160,20 do Airbnb, entao o custo liquido do casal
--       foi 1.493,83 — o reembolso NAO foi vinculado por nao ter valor/data
--       confirmados no extrato; conferir e vincular pelo app)
--    Seguro automóvel: 1.220,61 de despesa contra 1.193,86 de reembolso
--    Carros — Hyundai ix35: 3.100,00

select
  pr.name,
  count(*) filter (where t.type = 'despesa') as despesas,
  sum(t.amount_cents) filter (where t.type = 'despesa') / 100.0 as total_despesa,
  count(*) filter (where t.type = 'receita') as receitas,
  sum(t.amount_cents) filter (where t.type = 'receita') / 100.0 as total_receita
from public.projects pr
left join public.project_transactions pt on pt.project_id = pr.id
left join public.transactions t on t.id = pt.transaction_id
group by pr.name
order by pr.name;

-- 2. Quais das 6 linhas da planilha NAO acharam transacao. Esperado: nenhuma.
--    Se alguma aparecer, o valor ou a data divergem do extrato — conferir
--    antes de lancar a mao.
select d.projeto, d.tipo, d.valor_cents / 100.0 as valor, d.data_ref
from (values
  ('Casamento — Søborg/Copenhaga', 'despesa', 53823, date '2026-06-10'),
  ('Casamento — Søborg/Copenhaga', 'despesa', 64080, date '2026-06-11'),
  ('Casamento — Søborg/Copenhaga', 'despesa', 47500, date '2026-06-26'),
  ('Seguro automóvel',             'despesa', 122061, date '2026-07-06'),
  ('Seguro automóvel',             'receita', 119386, date '2026-07-16'),
  ('Carros — Hyundai ix35',        'despesa', 310000, date '2026-03-22')
) as d(projeto, tipo, valor_cents, data_ref)
where not exists (
  select 1 from public.transactions t
  where t.type::text = d.tipo
    and t.amount_cents = d.valor_cents
    and t.occurred_on between d.data_ref - 3 and d.data_ref + 3
);
