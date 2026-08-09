-- Corrige settlements criados pelo fluxo de "Lancamentos divididos".
-- O saldo geral desconta settlements.amount_cents; para pagamentos itemizados,
-- esse valor precisa ser a soma dos itens ja vinculados, nao necessariamente
-- o valor total da transferencia bancaria usada como comprovante.
update public.settlements s
set amount_cents = totais.total_cents
from (
  select settlement_id, sum(amount_cents)::bigint as total_cents
  from public.settlement_items
  group by settlement_id
) totais
where s.id = totais.settlement_id;

notify pgrst, 'reload schema';
