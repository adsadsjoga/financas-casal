-- APLICAR AGORA — cola inteiro no SQL Editor do Supabase e roda de uma vez.
-- Junta as 3 migrations novas de 2026-08-06/07 (Pessoas, Projetos, split_ledger).
-- Gerado a partir de supabase/migrations/ — não editar aqui, editar lá e regerar.
--
-- Depois de rodar isto: subir_nubank.sql e seed_pessoas.sql (nesta ordem,
-- Nubank primeiro — as pessoas usam as transações dele pra medir fluxo).

begin;

-- Expõe `category_id` no split_ledger para a tela de acerto conseguir mostrar
-- de onde vem a diferença (mercado? aluguel?).
--
-- Aditivo: mesma consulta, mesmo join, uma coluna a mais no select — sem risco
-- de performance (nada de novo join por linha, a armadilha documentada em
-- 20260803_performance_saldos.sql).
--
-- `category_id` vai no FINAL da lista, não entre occurred_on e
-- payer_profile_id: `create or replace view` do Postgres não permite mudar a
-- posição de coluna já existente (erro 42P16, "cannot change name of view
-- column"), só adicionar no fim. Não afeta o app: o Supabase JS lê por nome
-- de coluna, nunca por posição.

create or replace view public.split_ledger
with (security_invoker = on) as
  select t.couple_id,
         t.id as transaction_id,
         t.occurred_on,
         t.payer_profile_id,
         s.profile_id as debtor_profile_id,
         s.share_cents,
         t.category_id
  from public.transactions t
  join public.transaction_splits s on s.transaction_id = t.id
  where t.split_mode <> 'none'
    and t.payer_profile_id is not null
    and s.profile_id <> t.payer_profile_id;

notify pgrst, 'reload schema';

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

-- Projetos: marcam gastos de categorias diferentes que pertencem ao mesmo
-- esforço (uma viagem, o casamento, uma mudança). Complementam as categorias,
-- não substituem: um jantar em Cork continua sendo "Restaurantes" na
-- categoria e "Viagem Cork" no projeto.
--
-- Diferente de `goals`, que é meta de poupança (quanto falta juntar); aqui é o
-- oposto — quanto já foi gasto com aquilo.

create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  name       text not null,
  icon       text not null default '📁',
  archived   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, name)
);

-- N:N de propósito: a mesma transação pode pertencer a mais de um projeto
-- (um Uber que é da viagem e também da mudança).
create table if not exists public.project_transactions (
  project_id     uuid not null references public.projects(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  primary key (project_id, transaction_id)
);

create index if not exists projects_couple_idx
  on public.projects(couple_id) where not archived;
create index if not exists project_transactions_transaction_idx
  on public.project_transactions(transaction_id);

drop trigger if exists set_updated_at on public.projects;
create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.project_transactions enable row level security;

drop policy if exists projects_all on public.projects;
create policy projects_all on public.projects
  for all using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

-- Predicado de conjunto em vez de função por linha (mesma armadilha de
-- performance de RLS já documentada em 20260803_performance_saldos.sql).
drop policy if exists project_transactions_select on public.project_transactions;
create policy project_transactions_select on public.project_transactions
  for select using (
    project_id in (select p.id from public.projects p where p.couple_id = public.my_couple_id())
  );

-- No insert a checagem de transação é individual de propósito: sem ela daria
-- para vincular a um projeto uma transação de conta privada do parceiro e
-- descobrir o valor dela pelo total do projeto.
drop policy if exists project_transactions_insert on public.project_transactions;
create policy project_transactions_insert on public.project_transactions
  for insert with check (
    project_id in (select p.id from public.projects p where p.couple_id = public.my_couple_id())
    and public.can_see_transaction(transaction_id)
  );

drop policy if exists project_transactions_delete on public.project_transactions;
create policy project_transactions_delete on public.project_transactions
  for delete using (
    project_id in (select p.id from public.projects p where p.couple_id = public.my_couple_id())
  );

notify pgrst, 'reload schema';

commit;
