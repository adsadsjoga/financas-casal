-- Correção para quem já rodou o schema.sql antes desta mudança.
-- Projeto novo não precisa disto: o schema.sql já vem corrigido.
--
-- Problema: gen_invite_code() usava gen_random_bytes(), do pgcrypto. No
-- Supabase o pgcrypto fica no schema `extensions`, e create_couple() roda com
-- `search_path = public` (obrigatório em SECURITY DEFINER), então a função
-- ficava invisível e criar o casal falhava com
-- "function gen_random_bytes(integer) does not exist".
--
-- Solução: gen_random_uuid() é nativa do Postgres 13+ e não depende de
-- extensão nenhuma.

create or replace function public.gen_invite_code()
returns text language sql volatile set search_path = public as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

-- Confere: deve devolver 8 caracteres hexadecimais em maiúsculas.
select public.gen_invite_code() as codigo_de_exemplo;
