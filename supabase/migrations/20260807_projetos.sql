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
