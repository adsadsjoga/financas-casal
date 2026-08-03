-- Módulo Carros e conciliação com lançamentos financeiros.
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(), couple_id uuid not null references public.couples(id) on delete cascade,
  status text not null default 'estoque' check (status in ('estoque','vendido','cancelado')),
  make text not null, model text not null, year smallint check (year between 1900 and 2200), color text not null default '', mileage integer check (mileage >= 0), plate text not null default '',
  purchase_price_cents bigint not null check (purchase_price_cents > 0), purchase_date date not null default current_date, desired_sale_price_cents bigint check (desired_sale_price_cents > 0), sale_price_cents bigint check (sale_price_cents > 0), sale_date date, buyer_name text not null default '', notes text not null default '', photo_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint vehicles_sale_shape check ((status <> 'vendido') or (sale_price_cents is not null and sale_date is not null))
);
create table if not exists public.vehicle_costs (
  id uuid primary key default gen_random_uuid(), couple_id uuid not null references public.couples(id) on delete cascade, vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  category text not null default 'Outro', description text not null default '', amount_cents bigint not null check (amount_cents > 0), occurred_on date not null default current_date, created_at timestamptz not null default now()
);
create table if not exists public.vehicle_sale_installments (
  id uuid primary key default gen_random_uuid(), couple_id uuid not null references public.couples(id) on delete cascade, vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  installment_no smallint not null check (installment_no > 0), due_on date not null, amount_cents bigint not null check (amount_cents > 0), paid_on date, created_at timestamptz not null default now(), unique (vehicle_id, installment_no)
);
create table if not exists public.vehicle_transaction_links (
  id uuid primary key default gen_random_uuid(), couple_id uuid not null references public.couples(id) on delete cascade, vehicle_id uuid not null references public.vehicles(id) on delete cascade, transaction_id uuid not null references public.transactions(id) on delete cascade,
  role text not null check (role in ('compra','custo','entrada','parcela','ajuste')), created_at timestamptz not null default now(), unique (vehicle_id, transaction_id, role)
);
create index if not exists vehicles_couple_status_idx on public.vehicles(couple_id, status, purchase_date desc);
create index if not exists vehicle_costs_vehicle_idx on public.vehicle_costs(vehicle_id, occurred_on desc);
create index if not exists vehicle_installments_due_idx on public.vehicle_sale_installments(couple_id, due_on);
create index if not exists vehicle_links_vehicle_idx on public.vehicle_transaction_links(vehicle_id);
create index if not exists vehicle_links_transaction_idx on public.vehicle_transaction_links(transaction_id);
drop trigger if exists set_updated_at on public.vehicles;
create trigger set_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
alter table public.vehicles enable row level security; alter table public.vehicle_costs enable row level security; alter table public.vehicle_sale_installments enable row level security; alter table public.vehicle_transaction_links enable row level security;
drop policy if exists vehicles_all on public.vehicles; create policy vehicles_all on public.vehicles for all using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists vehicle_costs_all on public.vehicle_costs; create policy vehicle_costs_all on public.vehicle_costs for all using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists vehicle_installments_all on public.vehicle_sale_installments; create policy vehicle_installments_all on public.vehicle_sale_installments for all using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists vehicle_links_select on public.vehicle_transaction_links; create policy vehicle_links_select on public.vehicle_transaction_links for select using (public.is_couple_member(couple_id));
drop policy if exists vehicle_links_insert on public.vehicle_transaction_links; create policy vehicle_links_insert on public.vehicle_transaction_links for insert with check (public.is_couple_member(couple_id) and public.can_see_transaction(transaction_id));
drop policy if exists vehicle_links_delete on public.vehicle_transaction_links; create policy vehicle_links_delete on public.vehicle_transaction_links for delete using (public.is_couple_member(couple_id));
