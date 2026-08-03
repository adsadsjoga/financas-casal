-- Contrapartes: quem está do outro lado de cada lançamento (pessoa, cliente,
-- senhorio, estabelecimento). Serve para responder "quanto dinheiro já foi e
-- veio de fulano" — pergunta que hoje não dá para fazer, porque as
-- transferências históricas (Revolut, AIB, Wise) foram importadas como pares
-- receita/despesa separados, sem `transfer_account_id`.
--
-- O vínculo com `transactions` é por padrão de texto (alias), não por coluna
-- nova: a mesma pessoa aparece com grafias diferentes no extrato
-- ("JOANA PALMINHA", "JOANA FILIPA COSTA PALMINHA", "To Joana Palminha") e é
-- justamente juntar essas variações que dá valor à tela.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'counterparty_kind') then
    create type public.counterparty_kind as enum (
      'pessoa', 'familiar', 'amigo', 'cliente', 'vendedor', 'senhorio',
      'empregador', 'conta_propria', 'estabelecimento', 'desconhecido'
    );
  end if;
end $$;

create table if not exists public.counterparties (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  name       text not null,
  kind       public.counterparty_kind not null default 'desconhecido',
  notes      text not null default '',
  archived   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, name)
);

create table if not exists public.counterparty_aliases (
  id              uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references public.counterparties(id) on delete cascade,
  -- Já normalizado por normalize_description(): minúsculas, sem acento, sem
  -- pontuação. Mesma convenção de import_rules.pattern.
  pattern         text not null,
  created_at      timestamptz not null default now(),
  unique (counterparty_id, pattern)
);

create index if not exists counterparties_couple_idx
  on public.counterparties(couple_id) where not archived;
create index if not exists counterparty_aliases_pattern_idx
  on public.counterparty_aliases(pattern);
create index if not exists counterparty_aliases_counterparty_idx
  on public.counterparty_aliases(counterparty_id);

drop trigger if exists set_updated_at on public.counterparties;
create trigger set_updated_at before update on public.counterparties
  for each row execute function public.set_updated_at();

alter table public.counterparties enable row level security;
alter table public.counterparty_aliases enable row level security;

drop policy if exists counterparties_all on public.counterparties;
create policy counterparties_all on public.counterparties
  for all using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

-- Predicado de conjunto, não chamada de função por linha: com `in (select ...)`
-- o planner filtra uma vez; com função por linha varreria alias por alias.
drop policy if exists counterparty_aliases_all on public.counterparty_aliases;
create policy counterparty_aliases_all on public.counterparty_aliases
  for all using (
    counterparty_id in (
      select c.id from public.counterparties c
      where c.couple_id = public.my_couple_id()
    )
  )
  with check (
    counterparty_id in (
      select c.id from public.counterparties c
      where c.couple_id = public.my_couple_id()
    )
  );

notify pgrst, 'reload schema';
