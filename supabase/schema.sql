-- =============================================================================
-- Finanças do Casal — schema completo
-- Rode este arquivo inteiro no SQL Editor do Supabase (é idempotente o bastante
-- para rodar de novo num projeto limpo).
--
-- Princípios:
--   * Todo valor monetário é BIGINT em CENTAVOS. Nunca numeric/float.
--   * `amount_cents` é sempre POSITIVO; a direção vem de `type`.
--   * Nada é lido sem passar por RLS: sem política, sem dado.
--   * Multi-moeda: cada conta tem sua moeda; `amount_cents` está na moeda da
--     CONTA. A conversão para a moeda principal do casal é congelada no
--     momento do lançamento (`rate_to_primary`), como manda a contabilidade —
--     recalcular o passado com a cotação de hoje faria o histórico mudar
--     sozinho toda vez que o câmbio mexesse.
-- =============================================================================

-- Sem dependência de extensão de propósito: no Supabase o pgcrypto vive no
-- schema `extensions`, e as funções abaixo rodam com `search_path = public`
-- (obrigatório em SECURITY DEFINER). `gen_random_bytes` ficaria invisível.
-- `gen_random_uuid` é nativo do Postgres 13+ e não tem esse problema.

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

do $$ begin
  create type public.account_type as enum ('banco', 'cartao', 'dinheiro', 'investimento');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.category_kind as enum ('receita', 'despesa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tx_type as enum ('receita', 'despesa', 'transferencia');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.split_mode as enum ('none', 'equal', 'income', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.budget_scope as enum ('casal', 'pessoal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.import_source as enum ('ofx', 'csv', 'pdf', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.import_status as enum ('revisando', 'concluido', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.recurrence_kind as enum ('fixa', 'variavel');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rule_match as enum ('contains', 'regex');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- 2. UTILITÁRIOS
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

/**
 * Normaliza descrição para deduplicação e para casar regras de categorização:
 * minúsculas, sem acento, sem pontuação, espaços colapsados.
 * "PAG*IFOOD  São Paulo" -> "pag ifood sao paulo"
 */
create or replace function public.normalize_description(p_text text)
returns text language sql immutable as $$
  select btrim(regexp_replace(
    regexp_replace(
      lower(translate(
        coalesce(p_text, ''),
        'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
        'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
      )),
      '[^a-z0-9]+', ' ', 'g'
    ),
    '\s+', ' ', 'g'
  ));
$$;

create or replace function public.gen_invite_code()
returns text language sql volatile set search_path = public as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

-- =============================================================================
-- 3. TABELAS
-- =============================================================================

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Sem nome',
  avatar_emoji text not null default '🙂',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.couples (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Nosso casal',
  invite_code text not null unique default public.gen_invite_code(),
  -- Moeda em que patrimônio, orçamentos e metas são consolidados.
  primary_currency text not null default 'EUR' check (primary_currency ~ '^[A-Z]{3}$'),
  created_by  uuid not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id    uuid not null references public.couples(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  role         text not null default 'membro',
  -- Renda mensal declarada; alimenta a divisão proporcional de despesas.
  income_cents bigint not null default 0 check (income_cents >= 0),
  joined_at    timestamptz not null default now(),
  primary key (couple_id, profile_id)
);

create table if not exists public.accounts (
  id                    uuid primary key default gen_random_uuid(),
  couple_id             uuid not null references public.couples(id) on delete cascade,
  -- NULL = conta conjunta do casal. Preenchido = conta individual.
  owner_profile_id      uuid references public.profiles(id) on delete set null,
  name                  text not null,
  type                  public.account_type not null default 'banco',
  -- ISO 4217. Todos os valores desta conta estão nesta moeda.
  currency              text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  initial_balance_cents bigint not null default 0,
  color                 text not null default '#3498db',
  -- Conta privada some para o parceiro (inclusive as transações dela).
  is_private            boolean not null default false,
  archived              boolean not null default false,
  -- Só para type = 'cartao':
  closing_day           smallint check (closing_day between 1 and 31),
  due_day               smallint check (due_day between 1 and 31),
  credit_limit_cents    bigint check (credit_limit_cents >= 0),
  payment_account_id    uuid references public.accounts(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint accounts_private_needs_owner
    check (not is_private or owner_profile_id is not null),
  constraint accounts_card_fields
    check (type = 'cartao' or (closing_day is null and due_day is null))
);

create index if not exists accounts_couple_idx on public.accounts(couple_id) where not archived;

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  name       text not null,
  kind       public.category_kind not null default 'despesa',
  icon       text not null default '📦',
  color      text not null default '#94a3b8',
  parent_id  uuid references public.categories(id) on delete set null,
  archived   boolean not null default false,
  created_at timestamptz not null default now(),
  unique (couple_id, name, kind)
);

create table if not exists public.imports (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples(id) on delete cascade,
  account_id    uuid references public.accounts(id) on delete set null,
  file_name     text not null,
  -- sha256 do arquivo: barra reimportar exatamente o mesmo arquivo.
  file_hash     text not null,
  source        public.import_source not null,
  rows_total    integer not null default 0,
  rows_imported integer not null default 0,
  status        public.import_status not null default 'revisando',
  created_by    uuid not null references public.profiles(id) on delete restrict,
  created_at    timestamptz not null default now()
);

create unique index if not exists imports_couple_hash_idx
  on public.imports(couple_id, file_hash) where status = 'concluido';

create table if not exists public.transactions (
  id                   uuid primary key default gen_random_uuid(),
  couple_id            uuid not null references public.couples(id) on delete cascade,
  account_id           uuid not null references public.accounts(id) on delete cascade,
  category_id          uuid references public.categories(id) on delete set null,
  created_by           uuid not null references public.profiles(id) on delete restrict,
  -- Quem efetivamente pagou (base do acerto de contas).
  payer_profile_id     uuid references public.profiles(id) on delete set null,
  type                 public.tx_type not null,
  -- Na moeda da CONTA.
  amount_cents         bigint not null check (amount_cents > 0),
  -- Cotação congelada no dia do lançamento: 1 unidade da moeda da conta vale
  -- `rate_to_primary` unidades da moeda principal do casal.
  -- Sem default de propósito: nulo significa "descobre a taxa", e o trigger
  -- preenche antes do NOT NULL ser verificado. Com default 1 não daria para
  -- distinguir "não informei" de "é 1 mesmo".
  rate_to_primary      numeric(20,10) not null check (rate_to_primary > 0),
  -- amount_cents convertido para a moeda principal. Preenchido por trigger.
  amount_primary_cents bigint not null default 0,
  description          text not null default '',
  occurred_on          date not null,
  -- Fatura à qual a compra pertence (só cartão); primeiro dia do mês.
  invoice_month        date,
  transfer_account_id  uuid references public.accounts(id) on delete cascade,
  split_mode           public.split_mode not null default 'none',
  -- Parcelamento: 10 linhas compartilham o mesmo grupo.
  installment_group_id uuid,
  installment_no       smallint check (installment_no >= 1),
  installment_total    smallint check (installment_total >= 1),
  recurrence_id        uuid,
  import_id            uuid references public.imports(id) on delete set null,
  -- ID único do lançamento no banco (FITID do OFX): dedup forte.
  external_id          text,
  -- Impressão digital (conta+data+valor+descrição): dedup fraco, vira aviso.
  fingerprint          text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint transactions_transfer_shape check (
    (type = 'transferencia' and transfer_account_id is not null and transfer_account_id <> account_id)
    or (type <> 'transferencia' and transfer_account_id is null)
  ),
  constraint transactions_split_only_expense check (
    split_mode = 'none' or type = 'despesa'
  ),
  constraint transactions_installment_shape check (
    (installment_no is null and installment_total is null)
    or (installment_no is not null and installment_total is not null
        and installment_no <= installment_total)
  )
);

-- Dedup forte: o mesmo lançamento do banco nunca entra duas vezes.
create unique index if not exists transactions_account_external_idx
  on public.transactions(account_id, external_id) where external_id is not null;

create index if not exists transactions_couple_date_idx
  on public.transactions(couple_id, occurred_on desc);
create index if not exists transactions_account_date_idx
  on public.transactions(account_id, occurred_on desc);
-- Apoia dashboard e resumo mensal, que filtram por couple_id + type.
create index if not exists transactions_couple_type_idx
  on public.transactions(couple_id, type);
create index if not exists transactions_fingerprint_idx
  on public.transactions(account_id, fingerprint) where fingerprint is not null;
create index if not exists transactions_invoice_idx
  on public.transactions(account_id, invoice_month) where invoice_month is not null;
create index if not exists transactions_installment_idx
  on public.transactions(installment_group_id) where installment_group_id is not null;

create table if not exists public.transaction_splits (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  share_cents    bigint not null check (share_cents >= 0),
  primary key (transaction_id, profile_id)
);

create table if not exists public.settlements (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples(id) on delete cascade,
  from_profile  uuid not null references public.profiles(id) on delete restrict,
  to_profile    uuid not null references public.profiles(id) on delete restrict,
  amount_cents  bigint not null check (amount_cents > 0),
  settled_on    date not null default current_date,
  note          text not null default '',
  created_by    uuid not null references public.profiles(id) on delete restrict,
  created_at    timestamptz not null default now(),
  constraint settlements_distinct_parties check (from_profile <> to_profile)
);

create table if not exists public.recurrences (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples(id) on delete cascade,
  account_id   uuid references public.accounts(id) on delete set null,
  category_id  uuid references public.categories(id) on delete set null,
  description  text not null,
  amount_cents bigint not null check (amount_cents > 0),
  type         public.tx_type not null default 'despesa',
  day_of_month smallint not null check (day_of_month between 1 and 31),
  kind         public.recurrence_kind not null default 'fixa',
  split_mode   public.split_mode not null default 'none',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.budgets (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  -- Primeiro dia do mês do orçamento.
  month       date not null,
  scope       public.budget_scope not null default 'casal',
  profile_id  uuid references public.profiles(id) on delete cascade,
  limit_cents bigint not null check (limit_cents > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint budgets_scope_shape check (
    (scope = 'casal' and profile_id is null) or
    (scope = 'pessoal' and profile_id is not null)
  )
);

create unique index if not exists budgets_unique_idx
  on public.budgets(couple_id, category_id, month, coalesce(profile_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.goals (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples(id) on delete cascade,
  name         text not null,
  target_cents bigint not null check (target_cents > 0),
  deadline     date,
  icon         text not null default '🎯',
  color        text not null default '#f39c12',
  completed    boolean not null default false,
  archived     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.goal_contributions (
  id           uuid primary key default gen_random_uuid(),
  goal_id      uuid not null references public.goals(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete restrict,
  account_id   uuid references public.accounts(id) on delete set null,
  amount_cents bigint not null check (amount_cents <> 0),
  occurred_on  date not null default current_date,
  note         text not null default '',
  created_at   timestamptz not null default now()
);

create index if not exists goal_contributions_goal_idx
  on public.goal_contributions(goal_id);

create table if not exists public.import_rules (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples(id) on delete cascade,
  match_type  public.rule_match not null default 'contains',
  -- Já normalizado (ver normalize_description) quando match_type = 'contains'.
  pattern     text not null,
  category_id uuid references public.categories(id) on delete cascade,
  set_payer   uuid references public.profiles(id) on delete set null,
  set_split   public.split_mode,
  hits        integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (couple_id, match_type, pattern)
);

/**
 * Cotações do dia, em cache. Alimentado a partir do Frankfurter (dados do BCE)
 * pelo app; também dá para preencher na mão quando faltar.
 * rate = quantas unidades de `quote` valem 1 unidade de `base`.
 */
create table if not exists public.exchange_rates (
  base       text not null check (base ~ '^[A-Z]{3}$'),
  quote      text not null check (quote ~ '^[A-Z]{3}$'),
  day        date not null,
  rate       numeric(20,10) not null check (rate > 0),
  created_at timestamptz not null default now(),
  primary key (base, quote, day)
);

create table if not exists public.net_worth_snapshots (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples(id) on delete cascade,
  month       date not null,
  total_cents bigint not null,
  created_at  timestamptz not null default now(),
  unique (couple_id, month)
);

-- updated_at automático
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','couples','accounts','transactions','recurrences','budgets','goals'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; ' ||
      'create trigger set_updated_at before update on public.%I ' ||
      'for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- =============================================================================
-- 4. REGRAS DE NEGÓCIO (triggers)
-- =============================================================================

/**
 * Fatura de cartão: compra a partir do dia de fechamento cai na fatura do mês
 * seguinte. Contas que não são cartão ficam com invoice_month nulo.
 */
create or replace function public.compute_invoice_month(p_account uuid, p_occurred date)
returns date language plpgsql stable security definer set search_path = public as $$
declare
  v_type public.account_type;
  v_closing smallint;
begin
  select type, closing_day into v_type, v_closing
  from public.accounts where id = p_account;

  if v_type is distinct from 'cartao' then
    return null;
  end if;
  if v_closing is null then
    return date_trunc('month', p_occurred)::date;
  end if;
  if extract(day from p_occurred) >= v_closing then
    return (date_trunc('month', p_occurred) + interval '1 month')::date;
  end if;
  return date_trunc('month', p_occurred)::date;
end $$;

create or replace function public.transactions_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_moeda_conta text;
  v_moeda_casal text;
begin
  new.invoice_month := public.compute_invoice_month(new.account_id, new.occurred_on);

  -- Conversão para a moeda principal. Mesma moeda => taxa 1, sempre.
  select a.currency into v_moeda_conta from public.accounts a where a.id = new.account_id;
  select c.primary_currency into v_moeda_casal from public.couples c where c.id = new.couple_id;

  if v_moeda_conta is not distinct from v_moeda_casal then
    new.rate_to_primary := 1;
  elsif new.rate_to_primary is null or new.rate_to_primary <= 0 then
    -- Sem cotação informada, tenta o cache; se não achar, guarda 1 e deixa
    -- explícito que aquele lançamento precisa de revisão.
    new.rate_to_primary := coalesce(
      (select r.rate from public.exchange_rates r
        where r.base = v_moeda_conta and r.quote = v_moeda_casal
          and r.day <= new.occurred_on
        order by r.day desc limit 1),
      1
    );
  end if;

  new.amount_primary_cents := round(new.amount_cents * new.rate_to_primary);

  new.fingerprint := md5(
    new.account_id::text || '|' ||
    new.occurred_on::text || '|' ||
    new.amount_cents::text || '|' ||
    new.type::text || '|' ||
    public.normalize_description(new.description)
  );

  if new.payer_profile_id is null and new.type = 'despesa' then
    new.payer_profile_id := new.created_by;
  end if;

  return new;
end $$;

drop trigger if exists transactions_before_write on public.transactions;
create trigger transactions_before_write
  before insert or update of
    account_id, occurred_on, amount_cents, type, description, rate_to_primary
  on public.transactions
  for each row execute function public.transactions_before_write();

/** Cria o profile assim que o usuário se cadastra. */
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 5. HELPERS DE AUTORIZAÇÃO (SECURITY DEFINER — evitam recursão de RLS)
-- =============================================================================

-- auth.uid() faz parse de JSON do token a cada chamada. Envolvido em
-- `(select ...)` ele vira InitPlan e é avaliado uma vez por consulta, não
-- uma vez por linha — é a otimização padrão de RLS do Supabase.
create or replace function public.is_couple_member(p_couple uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.couple_members
    where couple_id = p_couple and profile_id = (select auth.uid())
  );
$$;

create or replace function public.my_couple_id()
returns uuid language sql stable security definer set search_path = public as $$
  select couple_id from public.couple_members
  where profile_id = auth.uid()
  order by joined_at
  limit 1;
$$;

/** Vê a conta? Precisa ser do casal E a conta não pode ser privada de outro. */
create or replace function public.can_see_account(p_account uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.accounts a
    where a.id = p_account
      and public.is_couple_member(a.couple_id)
      and (not a.is_private or a.owner_profile_id = (select auth.uid()))
  );
$$;

create or replace function public.can_see_transaction(p_tx uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.transactions t
    where t.id = p_tx and public.can_see_account(t.account_id)
  );
$$;

create or replace function public.can_see_goal(p_goal uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.goals g
    where g.id = p_goal and public.is_couple_member(g.couple_id)
  );
$$;

-- =============================================================================
-- 6. RPCs DE ONBOARDING
-- =============================================================================

/**
 * Cria o casal, entra nele e semeia as categorias padrão.
 * SECURITY DEFINER porque no instante do insert o usuário ainda não é membro
 * de nada — as políticas de RLS não teriam como aprovar.
 */
create or replace function public.create_couple(
  p_name text default 'Nosso casal',
  p_currency text default 'EUR'
)
returns public.couples language plpgsql security definer set search_path = public as $$
declare
  v_couple public.couples;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  if exists (select 1 from public.couple_members where profile_id = v_uid) then
    raise exception 'Você já faz parte de um casal';
  end if;

  insert into public.couples (name, primary_currency, created_by)
  values (
    coalesce(nullif(btrim(p_name), ''), 'Nosso casal'),
    coalesce(nullif(upper(btrim(p_currency)), ''), 'EUR'),
    v_uid
  )
  returning * into v_couple;

  insert into public.couple_members (couple_id, profile_id, role)
  values (v_couple.id, v_uid, 'dono');

  perform public.seed_default_categories(v_couple.id);

  return v_couple;
end $$;

create or replace function public.join_couple(p_code text)
returns public.couples language plpgsql security definer set search_path = public as $$
declare
  v_couple public.couples;
  v_uid uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  if exists (select 1 from public.couple_members where profile_id = v_uid) then
    raise exception 'Você já faz parte de um casal';
  end if;

  select * into v_couple from public.couples
  where invite_code = upper(btrim(p_code));

  if not found then
    raise exception 'Código de convite inválido';
  end if;

  select count(*) into v_count from public.couple_members where couple_id = v_couple.id;
  if v_count >= 2 then
    raise exception 'Este casal já tem duas pessoas';
  end if;

  insert into public.couple_members (couple_id, profile_id, role)
  values (v_couple.id, v_uid, 'membro');

  return v_couple;
end $$;

create or replace function public.seed_default_categories(p_couple uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.categories (couple_id, name, kind, icon, color) values
    (p_couple, 'Salário',            'receita', '💼', '#22c55e'),
    (p_couple, 'Pagamento de cliente','receita', '🧾', '#16a34a'),
    (p_couple, 'Venda de carro',     'receita', '🚙', '#15803d'),
    (p_couple, 'Rendimentos',        'receita', '📈', '#10b981'),
    (p_couple, 'Reembolso',          'receita', '↩️', '#34d399'),
    (p_couple, 'Outras receitas',    'receita', '➕', '#4ade80'),
    (p_couple, 'Moradia',            'despesa', '🏠', '#ef4444'),
    (p_couple, 'Contas de casa',     'despesa', '💡', '#f87171'),
    (p_couple, 'Mercado',            'despesa', '🛒', '#f97316'),
    (p_couple, 'Alimentação fora',   'despesa', '🍽️', '#fb923c'),
    (p_couple, 'Transporte',         'despesa', '🚌', '#3b82f6'),
    (p_couple, 'Combustível',        'despesa', '⛽', '#2563eb'),
    (p_couple, 'Carro',              'despesa', '🔧', '#1d4ed8'),
    (p_couple, 'Seguros',            'despesa', '🛡️', '#0ea5e9'),
    (p_couple, 'Saúde',              'despesa', '🏥', '#06b6d4'),
    (p_couple, 'Educação',           'despesa', '📚', '#8b5cf6'),
    (p_couple, 'Lazer',              'despesa', '🎉', '#ec4899'),
    (p_couple, 'Viagem',             'despesa', '✈️', '#d946ef'),
    (p_couple, 'Assinaturas',        'despesa', '📺', '#a855f7'),
    (p_couple, 'Marketing',          'despesa', '📣', '#7c3aed'),
    (p_couple, 'Compras',            'despesa', '🛍️', '#f43f5e'),
    (p_couple, 'Taxas e documentos', 'despesa', '🏛️', '#64748b'),
    (p_couple, 'Tarifas bancárias',  'despesa', '🏦', '#475569'),
    (p_couple, 'Pets',               'despesa', '🐾', '#84cc16'),
    (p_couple, 'Outras despesas',    'despesa', '📦', '#94a3b8')
  on conflict (couple_id, name, kind) do nothing;
end $$;

-- =============================================================================
-- 7. VIEWS
-- =============================================================================

/**
 * Cada transação vira um ou dois movimentos assinados por conta.
 * Transferência sai da origem e entra no destino — por isso duas linhas.
 */
create or replace view public.transaction_movements
with (security_invoker = on) as
  select t.id as transaction_id, t.couple_id, t.account_id, t.occurred_on,
         case when t.type = 'receita' then t.amount_cents else -t.amount_cents end as delta_cents,
         case when t.type = 'receita' then t.amount_primary_cents else -t.amount_primary_cents end as delta_primary_cents
  from public.transactions t
  where t.type in ('receita', 'despesa')
  union all
  select t.id, t.couple_id, t.account_id, t.occurred_on,
         -t.amount_cents, -t.amount_primary_cents
  from public.transactions t
  where t.type = 'transferencia'
  union all
  -- No destino o valor entra na moeda DELE. Numa transferência entre moedas
  -- diferentes (EUR -> BRL) os dois lados não são o mesmo número, então aqui
  -- reconvertemos pela moeda da conta de destino.
  select t.id, t.couple_id, t.transfer_account_id, t.occurred_on,
         round(t.amount_primary_cents / nullif(destino.rate_to_primary, 0))::bigint,
         t.amount_primary_cents
  from public.transactions t
  join lateral (
    select coalesce((
      select r.rate from public.exchange_rates r
      join public.accounts a on a.id = t.transfer_account_id
      join public.couples c on c.id = t.couple_id
      where r.base = a.currency and r.quote = c.primary_currency and r.day <= t.occurred_on
      order by r.day desc limit 1
    ), 1) as rate_to_primary
  ) destino on true
  where t.type = 'transferencia' and t.transfer_account_id is not null;

/**
 * Saldo sempre calculado, nunca materializado.
 * Em cartão o saldo é negativo — é dívida, e entra assim no patrimônio.
 */
-- Os movimentos são somados por conta ANTES do join. Com o GROUP BY depois
-- de um LEFT JOIN, o planner escolhia nested loop e varria a tabela inteira
-- de transações uma vez por conta (loops=7, 267k buffers, 8.8s) — estourando
-- o statement_timeout do app. Pré-agregado, é uma passada só.
create or replace view public.account_balances
with (security_invoker = on) as
  select a.id as account_id,
         a.couple_id,
         a.currency,
         a.initial_balance_cents + coalesce(m.delta_cents, 0) as balance_cents,
         -- Saldo convertido, para somar contas de moedas diferentes no
         -- patrimônio consolidado.
         round(
           (a.initial_balance_cents + coalesce(m.delta_cents, 0))
           * coalesce((
               select r.rate from public.exchange_rates r
               join public.couples c on c.id = a.couple_id
               where r.base = a.currency and r.quote = c.primary_currency
               order by r.day desc limit 1
             ), 1)
         )::bigint as balance_primary_cents
  from public.accounts a
  left join (
    select account_id, sum(delta_cents) as delta_cents
    from public.transaction_movements
    group by account_id
  ) m on m.account_id = a.id;

/** Quanto cada pessoa deve por transação dividida, com quem pagou ao lado. */
create or replace view public.split_ledger
with (security_invoker = on) as
  select t.couple_id,
         t.id as transaction_id,
         t.occurred_on,
         t.payer_profile_id,
         s.profile_id as debtor_profile_id,
         s.share_cents
  from public.transactions t
  join public.transaction_splits s on s.transaction_id = t.id
  where t.split_mode <> 'none'
    and t.payer_profile_id is not null
    and s.profile_id <> t.payer_profile_id;

-- =============================================================================
-- 8. RLS
-- =============================================================================

alter table public.profiles            enable row level security;
alter table public.couples             enable row level security;
alter table public.couple_members      enable row level security;
alter table public.accounts            enable row level security;
alter table public.categories          enable row level security;
alter table public.transactions        enable row level security;
alter table public.transaction_splits  enable row level security;
alter table public.settlements         enable row level security;
alter table public.recurrences         enable row level security;
alter table public.budgets             enable row level security;
alter table public.goals               enable row level security;
alter table public.goal_contributions  enable row level security;
alter table public.imports             enable row level security;
alter table public.import_rules        enable row level security;
alter table public.net_worth_snapshots enable row level security;
alter table public.exchange_rates      enable row level security;

-- Cotação não é dado de ninguém: qualquer pessoa logada lê e pode alimentar o
-- cache. Não há nada aqui que identifique um casal.
drop policy if exists exchange_rates_select on public.exchange_rates;
create policy exchange_rates_select on public.exchange_rates for select
  to authenticated using (true);

drop policy if exists exchange_rates_insert on public.exchange_rates;
create policy exchange_rates_insert on public.exchange_rates for insert
  to authenticated with check (true);

-- profiles: eu, e quem divide casal comigo
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  id = auth.uid()
  or exists (
    select 1 from public.couple_members me
    join public.couple_members other on other.couple_id = me.couple_id
    where me.profile_id = auth.uid() and other.profile_id = public.profiles.id
  )
);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- couples
drop policy if exists couples_select on public.couples;
create policy couples_select on public.couples for select
  using (public.is_couple_member(id));

drop policy if exists couples_update on public.couples;
create policy couples_update on public.couples for update
  using (public.is_couple_member(id)) with check (public.is_couple_member(id));

-- couple_members
drop policy if exists couple_members_select on public.couple_members;
create policy couple_members_select on public.couple_members for select
  using (public.is_couple_member(couple_id));

drop policy if exists couple_members_update on public.couple_members;
create policy couple_members_update on public.couple_members for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists couple_members_delete on public.couple_members;
create policy couple_members_delete on public.couple_members for delete
  using (profile_id = auth.uid());

-- accounts: privada só aparece para o dono
drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts for select using (
  public.is_couple_member(couple_id)
  and (not is_private or owner_profile_id = (select auth.uid()))
);

drop policy if exists accounts_insert on public.accounts;
create policy accounts_insert on public.accounts for insert
  with check (public.is_couple_member(couple_id));

drop policy if exists accounts_update on public.accounts;
create policy accounts_update on public.accounts for update
  using (public.is_couple_member(couple_id) and (not is_private or owner_profile_id = auth.uid()))
  with check (public.is_couple_member(couple_id));

drop policy if exists accounts_delete on public.accounts;
create policy accounts_delete on public.accounts for delete
  using (public.is_couple_member(couple_id) and (not is_private or owner_profile_id = auth.uid()));

-- Tabelas que seguem exatamente "é do meu casal?"
do $$
declare t text;
begin
  foreach t in array array[
    'categories','settlements','recurrences','budgets','goals',
    'imports','import_rules','net_worth_snapshots'
  ] loop
    execute format('drop policy if exists %1$s_all on public.%1$I;', t);
    execute format(
      'create policy %1$s_all on public.%1$I for all ' ||
      'using (public.is_couple_member(couple_id)) ' ||
      'with check (public.is_couple_member(couple_id));', t);
  end loop;
end $$;

-- transactions: herda a visibilidade da conta.
--
-- `account_id in (select id from accounts)` em vez de
-- `can_see_account(account_id)`: a subconsulta não é correlacionada, então o
-- Postgres a resolve UMA vez (InitPlan) e depois faz lookup em hash por
-- linha. Com a função opaca era uma chamada por linha — ~106 mil chamadas
-- numa leitura de saldos, o que sozinho consumia quase os 8s de timeout.
-- O `accounts` já tem RLS própria (mesmo casal + privada só do dono), então
-- o conjunto retornado é exatamente o que `can_see_account` autorizava.
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions for select
  using (account_id in (select id from public.accounts));

drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions for insert
  with check (
    public.is_couple_member(couple_id)
    and public.can_see_account(account_id)
    and (transfer_account_id is null or public.can_see_account(transfer_account_id))
  );

drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions for update
  using (public.can_see_account(account_id))
  with check (public.is_couple_member(couple_id) and public.can_see_account(account_id));

drop policy if exists transactions_delete on public.transactions;
create policy transactions_delete on public.transactions for delete
  using (public.can_see_account(account_id));

-- splits e aportes seguem o pai
drop policy if exists transaction_splits_all on public.transaction_splits;
create policy transaction_splits_all on public.transaction_splits for all
  using (public.can_see_transaction(transaction_id))
  with check (public.can_see_transaction(transaction_id));

drop policy if exists goal_contributions_all on public.goal_contributions;
create policy goal_contributions_all on public.goal_contributions for all
  using (public.can_see_goal(goal_id))
  with check (public.can_see_goal(goal_id));

-- =============================================================================
-- 9. REALTIME
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'accounts','transactions','transaction_splits','goals','goal_contributions',
    'budgets','recurrences','settlements','categories','couple_members'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I;', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
