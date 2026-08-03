-- Coluna de revisão de categoria: marca transações que caíram em categoria
-- genérica ("Outras despesas"/"Outras receitas") durante importação em
-- massa, sem confiança suficiente para uma categoria específica.
--
-- Backfill: marca como pendente tudo que já está hoje em uma dessas duas
-- categorias, para as ~1.071 transações importadas dos extratos brutos
-- (Gabriel + Joana) aparecerem na tela de revisão desde o primeiro load.

alter table public.transactions
  add column if not exists needs_review boolean not null default false;

create index if not exists transactions_couple_review_idx
  on public.transactions(couple_id) where needs_review;

update public.transactions t
set needs_review = true
from public.categories c
where c.id = t.category_id
  and c.name in ('Outras despesas', 'Outras receitas');
