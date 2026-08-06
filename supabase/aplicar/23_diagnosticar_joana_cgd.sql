-- DIAGNOSTICO — nao altera nada. Roda inteiro e confere os 5 resultados.
--
-- Conferencia antes de criar a conta CGD da Joana e sincronizar as
-- classificacoes das transacoes Revolut dela, a partir de
-- Joana_Ano_Completo_12M_Todos_Meses_Confirmados.xlsx (Downloads).
--
-- Se algum resultado vier diferente do esperado, PARAR e reavaliar — os
-- scripts seguintes (24_ e 25_, gerados por scripts/gerar_import_cgd_joana.py)
-- assumem que os numeros abaixo batem.

-- ---------------------------------------------------------------------------
-- 1. CGD ainda nao existe
-- ---------------------------------------------------------------------------
-- Esperado: 0 linhas. Se vier alguma, alguem ja criou a conta antes — parar
-- e conferir se ja tem transacoes importadas.

select id, name, currency, initial_balance_cents / 100.0 as saldo_inicial,
       owner_profile_id, archived
from public.accounts
where name ilike '%cgd%';

-- ---------------------------------------------------------------------------
-- 2. UUIDs das contas Revolut da Joana e do profile dela
-- ---------------------------------------------------------------------------
-- Necessario para: (a) apontar transfer_account_id nos pares CGD<->Revolut,
-- (b) recalcular localmente o fingerprint das transacoes ja importadas na
-- sincronizacao de categorias (25_).

select p.id as profile_id, p.display_name
from public.profiles p
order by p.display_name;

select a.id as account_id, a.couple_id, a.name, a.currency, a.type,
       a.owner_profile_id, a.initial_balance_cents / 100.0 as saldo_inicial,
       a.archived
from public.accounts a
where public.normalize_description(a.name) like '%revolut%'
order by a.name;

-- ---------------------------------------------------------------------------
-- 3. Contagem e soma atuais das transacoes Revolut da Joana
-- ---------------------------------------------------------------------------
-- Esperado (docs/estado-atual.md, "Contas da Joana — Revolut"): 2.381
-- transacoes na conta corrente (saldo 0,08), 1.619 na poupanca (total
-- 3.014,58 somando Poupanca + Australia). Confirma que nada mudou desde
-- 2026-08-03 antes de tocar em qualquer coisa.

select a.name as conta, a.owner_profile_id,
       count(t.id) as transacoes,
       count(t.id) filter (where t.needs_review) as precisam_revisao,
       sum(case when t.type = 'receita' then t.amount_cents else 0 end) / 100.0 as receitas,
       sum(case when t.type = 'despesa' then t.amount_cents else 0 end) / 100.0 as despesas
from public.accounts a
left join public.transactions t on t.account_id = a.id
where public.normalize_description(a.name) like '%revolut%'
group by a.id, a.name, a.owner_profile_id
order by a.name;

-- ---------------------------------------------------------------------------
-- 4. Categorias hoje em uso nas transacoes da Joana
-- ---------------------------------------------------------------------------
-- Base de comparacao contra a coluna "Categoria atualizada" do Excel — o
-- script de import (24_/25_) so cria categoria nova para o que nao aparecer
-- aqui.

select c.name, c.kind, count(t.id) as transacoes
from public.transactions t
join public.accounts a on a.id = t.account_id
join public.categories c on c.id = t.category_id
where public.normalize_description(a.name) like '%revolut%'
group by c.name, c.kind
order by transacoes desc;

-- ---------------------------------------------------------------------------
-- 5. needs_review nas contas da Joana (baseline)
-- ---------------------------------------------------------------------------
-- Usado depois de rodar 25_ para medir quanto a sincronizacao de categorias
-- resolveu. docs/estado-atual.md registra 740 pendentes na conta corrente
-- antes de qualquer sincronizacao.

select a.name as conta, count(*) as needs_review
from public.transactions t
join public.accounts a on a.id = t.account_id
where public.normalize_description(a.name) like '%revolut%'
  and t.needs_review
group by a.name
order by a.name;
