-- Faltava policy de UPDATE em vehicle_transaction_links: a tabela só tinha
-- select/insert/delete (20260802_carros.sql). Sem isso, "trocar papel" de um
-- vínculo (Fase 2) falha silenciosamente contra o RLS.
drop policy if exists vehicle_links_update on public.vehicle_transaction_links;
create policy vehicle_links_update on public.vehicle_transaction_links for update
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

-- Módulo Empréstimos — nos dois sentidos (emprestei / peguei emprestado),
-- conciliado contra lançamentos reais do extrato, mesmo modelo que Carros já
-- usa para "quanto o comprador já pagou".
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  counterparty_id uuid references public.counterparties(id) on delete set null,
  direction text not null check (direction in ('emprestei', 'peguei_emprestado')),
  description text not null default '',
  principal_cents bigint not null check (principal_cents > 0),
  occurred_on date not null default current_date,
  expected_return_date date,
  notes text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loan_transaction_links (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  role text not null check (role in ('desembolso', 'pagamento')),
  created_at timestamptz not null default now(),
  unique (loan_id, transaction_id)
);

create index if not exists loans_couple_idx on public.loans(couple_id, archived, occurred_on desc);
create index if not exists loan_links_loan_idx on public.loan_transaction_links(loan_id);
create index if not exists loan_links_transaction_idx on public.loan_transaction_links(transaction_id);

drop trigger if exists set_updated_at on public.loans;
create trigger set_updated_at before update on public.loans for each row execute function public.set_updated_at();

alter table public.loans enable row level security;
alter table public.loan_transaction_links enable row level security;

drop policy if exists loans_all on public.loans;
create policy loans_all on public.loans for all
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

drop policy if exists loan_links_select on public.loan_transaction_links;
create policy loan_links_select on public.loan_transaction_links for select
  using (public.is_couple_member(couple_id));
drop policy if exists loan_links_insert on public.loan_transaction_links;
create policy loan_links_insert on public.loan_transaction_links for insert
  with check (public.is_couple_member(couple_id) and public.can_see_transaction(transaction_id));
drop policy if exists loan_links_update on public.loan_transaction_links;
create policy loan_links_update on public.loan_transaction_links for update
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));
drop policy if exists loan_links_delete on public.loan_transaction_links;
create policy loan_links_delete on public.loan_transaction_links for delete
  using (public.is_couple_member(couple_id));

notify pgrst, 'reload schema';
