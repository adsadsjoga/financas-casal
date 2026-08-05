-- Conta do comprador (carros) + Projetos como registro geral de planos do
-- casal, não só viagem já feita.
--
-- Ver docs/carros.md e docs/estado-atual.md para o contexto completo.

-- vehicles.buyer_counterparty_id: liga o comprador de um carro a uma
-- contraparte já cadastrada (public.counterparties), pra puxar TODAS as
-- transações dela — em qualquer conta — na tela do carro, em vez de vasculhar
-- na mão. `buyer_name` (texto livre) continua existindo, agora como rótulo de
-- exibição/fallback pra quando não há contraparte cadastrada.
alter table public.vehicles
  add column if not exists buyer_counterparty_id uuid
    references public.counterparties(id) on delete set null;

create index if not exists vehicles_buyer_counterparty_idx
  on public.vehicles(buyer_counterparty_id) where buyer_counterparty_id is not null;

-- projects.kind: separa "projetos do casal" (viagem, casamento, qualquer
-- plano grande) de um futuro "despesas gerais do negócio de carros" — este
-- não tem tela ainda, a coluna só existe pra não pedir outra migration
-- quando a tela de negócio entrar. Default 'pessoal' não muda nada visível
-- hoje: /projetos já filtra só isso.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'project_kind') then
    create type public.project_kind as enum ('pessoal', 'negocio');
  end if;
end $$;

alter table public.projects
  add column if not exists kind public.project_kind not null default 'pessoal';

-- projects.planned_amount_cents: "queremos fazer isso, vai custar mais ou
-- menos X" — nullable; projeto sem valor planejado funciona exatamente como
-- antes (só custo real). Diferente de `goals` (meta de poupança, quanto
-- falta juntar): aqui é orçamento de gasto, não meta de guardar dinheiro.
alter table public.projects
  add column if not exists planned_amount_cents bigint check (planned_amount_cents > 0);

notify pgrst, 'reload schema';
