create table if not exists public.internal_transfer_links (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  out_transaction_id uuid not null references public.transactions(id) on delete cascade,
  in_transaction_id uuid not null references public.transactions(id) on delete cascade,
  notes text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint internal_transfer_links_distinct_transactions
    check (out_transaction_id <> in_transaction_id),
  unique (out_transaction_id),
  unique (in_transaction_id)
);

create index if not exists internal_transfer_links_couple_idx
  on public.internal_transfer_links(couple_id, created_at desc);

alter table public.internal_transfer_links enable row level security;

drop policy if exists internal_transfer_links_select on public.internal_transfer_links;
create policy internal_transfer_links_select on public.internal_transfer_links for select
  using (
    public.is_couple_member(couple_id)
    and public.can_see_transaction(out_transaction_id)
    and public.can_see_transaction(in_transaction_id)
  );

drop policy if exists internal_transfer_links_insert on public.internal_transfer_links;
create policy internal_transfer_links_insert on public.internal_transfer_links for insert
  with check (
    public.is_couple_member(couple_id)
    and public.can_see_transaction(out_transaction_id)
    and public.can_see_transaction(in_transaction_id)
  );

drop policy if exists internal_transfer_links_delete on public.internal_transfer_links;
create policy internal_transfer_links_delete on public.internal_transfer_links for delete
  using (
    public.is_couple_member(couple_id)
    and public.can_see_transaction(out_transaction_id)
    and public.can_see_transaction(in_transaction_id)
  );
