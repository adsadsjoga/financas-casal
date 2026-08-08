-- Itemiza um `settlements` (pagamento real de acerto) contra a(s) despesa(s)
-- dividida(s) que ele cobre. Antes, um settlement era só um número avulso
-- ("Joana pagou X pro Gabriel"), sem nenhum jeito de ver, a partir de uma
-- despesa dividida específica, se ela já foi paga e por qual transferência
-- real -- ficava um saldo abstrato sem prova.
--
-- Não muda a matemática do saldo: o que já abate o saldo (calcularSaldoAcerto)
-- continua sendo a existência do `settlements`, não os itens. Um settlement
-- pode ter zero, um ou vários itens; sem item nenhum, continua funcionando
-- exatamente como hoje (acerto avulso, sem itemização).
create table if not exists public.settlement_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  expense_transaction_id uuid not null references public.transactions(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  unique (settlement_id, expense_transaction_id)
);

create index if not exists settlement_items_settlement_idx on public.settlement_items(settlement_id);
create index if not exists settlement_items_expense_idx on public.settlement_items(expense_transaction_id);

alter table public.settlement_items enable row level security;

-- SELECT também checa can_see_transaction, não só is_couple_member -- mesmo
-- ajuste já feito em loan/vehicle_transaction_links (20260817), pra não
-- vazar referência a lançamento de conta privada pro parceiro.
drop policy if exists settlement_items_select on public.settlement_items;
create policy settlement_items_select on public.settlement_items for select
  using (public.is_couple_member(couple_id) and public.can_see_transaction(expense_transaction_id));

drop policy if exists settlement_items_insert on public.settlement_items;
create policy settlement_items_insert on public.settlement_items for insert
  with check (public.is_couple_member(couple_id) and public.can_see_transaction(expense_transaction_id));

drop policy if exists settlement_items_delete on public.settlement_items;
create policy settlement_items_delete on public.settlement_items for delete
  using (public.is_couple_member(couple_id));

notify pgrst, 'reload schema';
