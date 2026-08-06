-- Reforma de Investimentos: preço médio manual (pra calcular ganho de
-- mercado contra o custo real, não só contra o aporte líquido agregado),
-- notas livres, arquivar posição sem perder histórico, e registro manual de
-- dividendo recebido (extrato não identifica dividendo por regex de forma
-- confiável — melhor pedir pro casal registrar do que adivinhar errado).

alter table public.investment_holdings
  add column if not exists avg_price_cents bigint check (avg_price_cents is null or avg_price_cents > 0),
  add column if not exists notes text,
  add column if not exists archived boolean not null default false;

create table if not exists public.investment_dividends (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples(id) on delete cascade,
  -- Mesmo texto livre do ticker em investment_holdings — não é FK porque o
  -- "ativo" continua sendo derivado de texto, não uma entidade cadastrada.
  ticker       text not null,
  amount_cents bigint not null check (amount_cents > 0),
  paid_on      date not null,
  notes        text,
  created_at   timestamptz not null default now()
);

alter table public.investment_dividends enable row level security;

drop policy if exists investment_dividends_all on public.investment_dividends;
create policy investment_dividends_all on public.investment_dividends
  for all using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

create index if not exists investment_dividends_couple_idx
  on public.investment_dividends(couple_id);

notify pgrst, 'reload schema';
