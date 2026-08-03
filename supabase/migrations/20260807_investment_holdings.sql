-- Quantidade que o casal informa manualmente pra cada ticker (ação/FII/ETF).
-- O extrato do Nubank só traz o valor total gasto em cada compra, nunca
-- quantidade nem preço por cota — não tem como derivar isso do que já foi
-- importado. `numeric`, não inteiro: compra fracionária é normal no Nubank
-- (ex: R$ 12,88 de CASH3 a ~R$ 4,60 vira ~2,8 ações).
--
-- Preço de mercado NÃO fica guardado aqui — é buscado ao vivo (brapi.dev,
-- API pública sem token) toda vez que a tela abre, igual o app já faz com
-- câmbio em `exchange_rates`/`src/lib/fx.ts`, só que sem cache em tabela
-- porque cotação de ação muda o dia inteiro, não uma vez por dia como câmbio.

create table if not exists public.investment_holdings (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples(id) on delete cascade,
  -- Ticker igual ao que src/lib/investimentos.ts extrai da descrição
  -- (CASH3, CPTS11 etc.) — não é FK pra lugar nenhum porque o "ativo" não é
  -- uma entidade cadastrada, é derivado de texto.
  ticker     text not null,
  quantity   numeric(20,8) not null check (quantity >= 0),
  updated_at timestamptz not null default now(),
  unique (couple_id, ticker)
);

alter table public.investment_holdings enable row level security;

drop policy if exists investment_holdings_all on public.investment_holdings;
create policy investment_holdings_all on public.investment_holdings
  for all using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

drop trigger if exists set_updated_at on public.investment_holdings;
create trigger set_updated_at before update on public.investment_holdings
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
