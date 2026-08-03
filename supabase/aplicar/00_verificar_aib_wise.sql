-- Só leitura — não muda nada. Confirma que AIB e Wise, importados em
-- 2026-08-02 (ver Documents\Contas casal\HANDOFF_CLAUDE_CONCILIACAO.md),
-- sobreviveram intactos à reconstrução do Revolut do Gabriel de 2026-08-03
-- (que apagou e reimportou as transações de Revolut, mas não deveria ter
-- tocado em contas de outro banco).
--
-- Esperado (do handoff original):
--   AIB      | 228 transações | créditos = débitos | saldo 0,00
--   Wise EUR | 434 transações | créditos = débitos | saldo 0,00 (em EUR)
--   Wise BRL | 136 transações | créditos = débitos | saldo 0,00 (em BRL)
--
-- Se os números baterem, seguir para 01_migrations_pessoas_projetos.sql.
-- Se não baterem, parar aqui — os próximos passos (Pessoas, Nubank) assumem
-- que esse histórico está saudável.

select
  a.name as conta,
  a.currency as moeda,
  count(t.id) as num_transacoes,
  sum(case when t.type = 'receita' then t.amount_cents else 0 end) / 100.0 as creditos,
  sum(case when t.type = 'despesa' then t.amount_cents else 0 end) / 100.0 as debitos,
  sum(case when t.type = 'receita' then t.amount_cents else -t.amount_cents end) / 100.0 as saldo_movimentos
from public.accounts a
left join public.transactions t on t.account_id = a.id
where a.name ilike '%aib%' or a.name ilike '%wise%'
group by a.name, a.currency
order by a.name;

-- Se esta consulta não devolver nenhuma linha, as contas não existem no
-- banco atual (o handoff pode ter ficado só no arquivo, sem ter sido
-- efetivamente rodado) — nesse caso o AIB e o Wise ainda precisam ser
-- importados do zero antes de qualquer coisa depender deles.
