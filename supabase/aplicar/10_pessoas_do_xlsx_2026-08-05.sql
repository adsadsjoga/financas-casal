-- Gerado por scripts/seed_pessoas_do_excel.py — CONFERIR antes de rodar.
--
-- Conferir principalmente:
--   1. grafias agrupadas na mesma pessoa (bloco 'aliases:' de cada uma);
--   2. a coluna kind — quase tudo sai 'desconhecido' de propósito;
--   3. os 24 grupos marcados AMBIGUO: uma grafia curta servia
--      para mais de uma pessoa e caiu na de maior movimento.

--   192,025.10 · aliases: EUR Carros
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'EUR Carros', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('eur carros')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--    94,609.56 · aliases: DR JOHN CLARKE, Dr John Clarke
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'DR JOHN CLARKE', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('dr john clarke')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--    73,602.78 · aliases: JOANA FILIPA COSTA PALMINHA, Joana Palminha ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'JOANA FILIPA COSTA PALMINHA', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('joana filipa costa palminha'),
  ('joana palminha')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--    70,655.76 · aliases: EUR Flexible Cash Funds, Flexible Cash Funds
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'EUR Flexible Cash Funds', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('eur flexible cash funds'),
  ('flexible cash funds')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--    41,162.33 · aliases: Gabriel Garcia de Araujo, GABRIEL GARCIA DE ARAUJO, Gabriel Garcia De Araujo, GABRIEL GARCIA DE ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Gabriel Garcia de Araujo', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel garcia de'),
  ('gabriel garcia de araujo')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--    32,128.76 · aliases: EUR Brasil
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'EUR Brasil', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('eur brasil')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--    28,261.82 · aliases: EUR Reserva
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'EUR Reserva', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('eur reserva')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--    21,263.48 · aliases: Savings Vault topup
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Savings Vault topup', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('savings vault topup')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--    20,365.16 · aliases: DOUGLAS ENGRAVING & DESIGN
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'DOUGLAS ENGRAVING & DESIGN', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('douglas engraving design')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--    18,419.25 · aliases: Revolut Bank UAB
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Revolut Bank UAB', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('revolut bank uab')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--    14,153.66 · aliases: EUR Aluguel
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'EUR Aluguel', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('eur aluguel')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--    11,063.77 · aliases: Apple Pay top-up by *7734, Top Up
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Apple Pay top-up by *7734', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('apple pay top up by 7734'),
  ('top up')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     9,163.04 · aliases: EUR Voos para o br, Voos para o br
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'EUR Voos para o br', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('eur voos para o br'),
  ('voos para o br')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     7,043.71 · aliases: Revolut
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Revolut', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('revolut')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     6,635.00 · aliases: GABRIEL ARAUJO
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'GABRIEL ARAUJO', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel araujo')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     6,177.35 · aliases: Gabriel Garcia AIb ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Gabriel Garcia AIb', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel garcia aib')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     6,148.27 · aliases: investment account
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'investment account', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('investment account')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     6,037.70 · aliases: Sonia Maria Ferreira Costa, SONIA MARIA FERREIRA COSTA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Sonia Maria Ferreira Costa', 'familiar' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('sonia maria ferreira costa')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     5,273.00 · aliases: Gabriel Garcia - Wise, Gabriel Wise Garcia ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Gabriel Garcia - Wise', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel garcia wise'),
  ('gabriel wise garcia')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     4,305.12 · aliases: Transferência enviada pelo Pix - Fábio Ferreira da Silva Araujo (Transferência enviada), Fábio Ferreira da Silva Araujo, FABIO FERREIRA DA SILVA ARAUJO
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Transferência enviada pelo Pix - Fábio Ferreira da Silva Araujo (Transferência enviada)', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('fabio ferreira da silva araujo'),
  ('transferencia enviada pelo pix fabio ferreira da silva araujo transferencia enviada')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     4,159.00 · aliases: GABRIEL GOMES GARCIA DA SILVEIRA, Gabriel Garcia ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'GABRIEL GOMES GARCIA DA SILVEIRA', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel garcia'),
  ('gabriel gomes garcia da silveira')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     3,951.24 · aliases: FITZGERALDS VIENNA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'FITZGERALDS VIENNA', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('fitzgeralds vienna')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     3,902.86 · aliases: Michael Rent
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Michael Rent', 'senhorio' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('michael rent')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     3,705.19 · aliases: WISE BRASIL CORRETORA DE CAMBIO LTDA, Wise Brasil Corretora de Câmbio Ltda.
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Wise Brasil Corretora de Câmbio Ltda.', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('wise brasil corretora de cambio ltda')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     3,253.15 · aliases: Patrick Dacio Ferreira, PATRICK DACIO FERREIRA, Patrick Dacio
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Patrick Dacio Ferreira', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('patrick dacio'),
  ('patrick dacio ferreira')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     3,100.00 · aliases: KAMELIA KHALFI
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'KAMELIA KHALFI', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('kamelia khalfi')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     2,901.85 · aliases: KELLY CRISTINA DIAS PEREIRA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'KELLY CRISTINA DIAS PEREIRA', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('kelly cristina dias pereira')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     2,900.00 · aliases: JAKSON DE SOUZA SANTOS
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'JAKSON DE SOUZA SANTOS', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('jakson de souza santos')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     2,900.00 · aliases: IRENE BENITEZ SUAREZ
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'IRENE BENITEZ SUAREZ', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('irene benitez suarez')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     2,870.00 · aliases: CRISTIANE ALVES GONCALVES, Cristiane Alves Gonçalves
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'CRISTIANE ALVES GONCALVES', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('cristiane alves goncalves')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     2,765.00 · aliases: NAUAN CABRINI
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'NAUAN CABRINI', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('nauan cabrini')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     2,678.00 · aliases: DANILO ROCHA DA SILVA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'DANILO ROCHA DA SILVA', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('danilo rocha da silva')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     2,500.00 · aliases: Personal loan
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Personal loan', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('personal loan')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     2,300.00 · aliases: PABLO NOGUEIRA COSTA OLIVEIRA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'PABLO NOGUEIRA COSTA OLIVEIRA', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('pablo nogueira costa oliveira')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     2,086.81 · aliases: GABRIEL GARC
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'GABRIEL GARC', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel garc')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,911.16 · aliases: 123 Money Limi, 123 Money
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, '123 Money Limi', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('123 money'),
  ('123 money limi')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,801.83 · aliases: GABRIEL REZENDE TEIXEIRA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'GABRIEL REZENDE TEIXEIRA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel rezende teixeira')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,800.00 · aliases: FERNANDO MIGUEL AMORIM CARRAPICO SERINA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'FERNANDO MIGUEL AMORIM CARRAPICO SERINA', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('fernando miguel amorim carrapico serina')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,700.00 · aliases: MINDAUGAS PASKEVICIUS
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'MINDAUGAS PASKEVICIUS', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('mindaugas paskevicius')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,600.00 · aliases: JESUS DOMINGO MIGUEL CASANOVA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'JESUS DOMINGO MIGUEL CASANOVA', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('jesus domingo miguel casanova')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,600.00 · aliases: THOMAS PATRICK ENRIGHT
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'THOMAS PATRICK ENRIGHT', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('thomas patrick enright')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,500.00 · aliases: ANA MARTINEZ ALVAREZ
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'ANA MARTINEZ ALVAREZ', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('ana martinez alvarez')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,500.00 · aliases: JAMIE SLATER
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'JAMIE SLATER', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('jamie slater')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,443.54 · aliases: Wise Brasil Instituicao de Pagamento Ltda
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Wise Brasil Instituicao de Pagamento Ltda', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('wise brasil instituicao de pagamento ltda')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,306.85 · aliases: WAGES W43-4-090515
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'WAGES W43-4-090515', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('wages w43 4 090515')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,300.00 · aliases: MARGARET PAULINE SUTTON
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'MARGARET PAULINE SUTTON', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('margaret pauline sutton')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,299.80 · aliases: OFFICE OF THE REVENUE COMMISSIONERS
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'OFFICE OF THE REVENUE COMMISSIONERS', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('office of the revenue commissioners')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,280.00 · aliases: DARRA O'CONNELL
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'DARRA O''CONNELL', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('darra o connell')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,200.00 · aliases: MAYCON WILLIAM ALVES BARBOSA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'MAYCON WILLIAM ALVES BARBOSA', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('maycon william alves barbosa')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,200.00 · aliases: ESTEFANIA TORRES ESQUIVEL
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'ESTEFANIA TORRES ESQUIVEL', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('estefania torres esquivel')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,200.00 · aliases: MARTIN SAMAGLO
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'MARTIN SAMAGLO', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('martin samaglo')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,170.00 · aliases: DOUGLAS RO
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'DOUGLAS RO', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('douglas ro')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,118.00 · aliases: Joana Palminha irl ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Joana Palminha irl', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('joana palminha irl')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,050.00 · aliases: R SOMMER B GARCEZ
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'R SOMMER B GARCEZ', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('r sommer b garcez')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,000.00 · aliases: CAR
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'CAR', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('car')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       917.70 · aliases: EUR Side Hustle 💸, Side Hustle 💸
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'EUR Side Hustle 💸', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('eur side hustle'),
  ('side hustle')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       916.05 · aliases: EDUARDO NUNES DA SILVA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'EDUARDO NUNES DA SILVA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('eduardo nunes da silva')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       902.50 · aliases: GABRIEL
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'GABRIEL', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       850.00 · aliases: BALLINCOLLIG
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'BALLINCOLLIG', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('ballincollig')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       772.79 · aliases: SECR. DA RECEITA FEDERAL
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'SECR. DA RECEITA FEDERAL', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('secr da receita federal')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       729.84 · aliases: Gabriel Indiano
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Gabriel Indiano', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel indiano')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       707.00 · aliases: JUSTIN CRAIG WHEELER
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'JUSTIN CRAIG WHEELER', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('justin craig wheeler')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       700.00 · aliases: CLAUDIANE BANDEIRA DE SOUSA ALVES
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'CLAUDIANE BANDEIRA DE SOUSA ALVES', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('claudiane bandeira de sousa alves')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       700.00 · aliases: GERALDINE MARY MULLANE
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'GERALDINE MARY MULLANE', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('geraldine mary mullane')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       686.00 · aliases: Aluguel
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Aluguel', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('aluguel')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       670.68 · aliases: Carpet
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Carpet', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('carpet')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       650.00 · aliases: JOSIVANIO DA SILVA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'JOSIVANIO DA SILVA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('josivanio da silva')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       640.00 · aliases: 1060'CONNC — Card ending 6532
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, '1060''CONNC — Card ending 6532', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('1060 connc card ending 6532')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       627.00 · aliases: Transferência enviada pelo Pix - GESNER APARECIDO GARCIA (Transferência enviada), GESNER APARECIDO GARCIA ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Transferência enviada pelo Pix - GESNER APARECIDO GARCIA (Transferência enviada)', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gesner aparecido garcia'),
  ('transferencia enviada pelo pix gesner aparecido garcia transferencia enviada')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       601.20 · aliases: PATRICK
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'PATRICK', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('patrick')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       600.00 · aliases: 1347310549
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, '1347310549', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('1347310549')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       592.14 · aliases: Circle K Gas Station ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Circle K Gas Station', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('circle k gas station')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       550.00 · aliases: MARIA ZORAIDA CANO GONZALEZ
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'MARIA ZORAIDA CANO GONZALEZ', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('maria zoraida cano gonzalez')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       550.00 · aliases: CIARA WILKIN
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'CIARA WILKIN', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('ciara wilkin')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       512.17 · aliases: WAGES W45-4-110804
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'WAGES W45-4-110804', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('wages w45 4 110804')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       500.01 · aliases: 30672 CIRCLE K DOUGLAS CORK, Circle K ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, '30672 CIRCLE K DOUGLAS CORK', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('30672 circle k douglas cork'),
  ('circle k')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       500.00 · aliases: DOUGLAS
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'DOUGLAS', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('douglas')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       486.00 · aliases: House Landlord
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'House Landlord', 'senhorio' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('house landlord')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       450.00 · aliases: BEATRIZ GARCEZ FRE
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'BEATRIZ GARCEZ FRE', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('beatriz garcez fre')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       450.00 · aliases: KIERAN BROWNE
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'KIERAN BROWNE', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('kieran browne')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       444.00 · aliases: Transferência enviada pelo Pix - Lilian Fragoso Vieira Ravaneda David (Transferência enviada), Transferência enviada pelo Pix ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Transferência enviada pelo Pix - Lilian Fragoso Vieira Ravaneda David (Transferência enviada)', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('transferencia enviada pelo pix'),
  ('transferencia enviada pelo pix lilian fragoso vieira ravaneda david transferencia enviada')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       436.00 · aliases: FRANK & CATHERINE SHEAHAN
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'FRANK & CATHERINE SHEAHAN', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('frank catherine sheahan')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       425.02 · aliases: WAGES W46-3-143158
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'WAGES W46-3-143158', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('wages w46 3 143158')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       400.46 · aliases: WAGES W44-4-121848
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'WAGES W44-4-121848', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('wages w44 4 121848')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       400.10 · aliases: EUR Escola
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'EUR Escola', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('eur escola')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       400.00 · aliases: B GARCEZ FREITAS D
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'B GARCEZ FREITAS D', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('b garcez freitas d')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       360.50 · aliases: GABRIEL OLIVEIRA GOMES
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'GABRIEL OLIVEIRA GOMES', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel oliveira gomes')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       355.62 · aliases: www.aig.ie*Vilnius
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'www.aig.ie*Vilnius', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('www aig ie vilnius')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       350.00 · aliases: Leevin
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Leevin', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('leevin')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       335.00 · aliases: THOMAS ANTHONY DEASY
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'THOMAS ANTHONY DEASY', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('thomas anthony deasy')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       329.00 · aliases: EUR Austrália 2027/2028
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'EUR Austrália 2027/2028', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('eur australia 2027 2028')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       309.74 · aliases: TRIALPAYMENT IE26072496323039
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'TRIALPAYMENT IE26072496323039', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('trialpayment ie26072496323039')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       304.36 · aliases: Gabriel -Eu Garcia ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Gabriel -Eu Garcia', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel eu garcia')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       304.00 · aliases: National Car Testing Service
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'National Car Testing Service', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('national car testing service')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       300.00 · aliases: JOSE GONCALVES DA SILVA, Jose Goncalves Da Silva
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'JOSE GONCALVES DA SILVA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('jose goncalves da silva')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       300.00 · aliases: JOANA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'JOANA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('joana')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       299.44 · aliases: SILVANA URRUTTI CALLEJAS
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'SILVANA URRUTTI CALLEJAS', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('silvana urrutti callejas')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       295.00 · aliases: PAULO ROBERTO ZAKCZEWISKI
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'PAULO ROBERTO ZAKCZEWISKI', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('paulo roberto zakczewiski')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       294.92 · aliases: WESTFORD PUBLIC HO
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'WESTFORD PUBLIC HO', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('westford public ho')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       286.50 · aliases: Grove Island Sport And Leisure Facilities Ltd, Grove Island Sport And Leisure Facilities
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Grove Island Sport And Leisure Facilities Ltd', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('grove island sport and leisure facilities'),
  ('grove island sport and leisure facilities ltd')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       280.00 · aliases: Transferência enviada pelo Pix - LEONARDO GOMES SIQUEIRA (Transferência enviada) ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Transferência enviada pelo Pix - LEONARDO GOMES SIQUEIRA (Transferência enviada)', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('transferencia enviada pelo pix leonardo gomes siqueira transferencia enviada')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       249.88 · aliases: WAGES W40-2-111954
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'WAGES W40-2-111954', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('wages w40 2 111954')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       245.84 · aliases: WAGES W42-3-105632
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'WAGES W42-3-105632', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('wages w42 3 105632')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       241.54 · aliases: Brasil 2026
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Brasil 2026', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('brasil 2026')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       221.58 · aliases: BRASIL BY BUS VIAGENS E SOLUCOES
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'BRASIL BY BUS VIAGENS E SOLUCOES', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('brasil by bus viagens e solucoes')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       215.00 · aliases: Road Safety Authority
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Road Safety Authority', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('road safety authority')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       212.18 · aliases: Patrick Wise
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Patrick Wise', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('patrick wise')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       206.50 · aliases: MARINA CASADO RINCON
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'MARINA CASADO RINCON', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('marina casado rincon')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       202.83 · aliases: WAGES W41-2-103603
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'WAGES W41-2-103603', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('wages w41 2 103603')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       186.06 · aliases: Inver
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Inver', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('inver')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       185.54 · aliases: REVCOM050086658MB2
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'REVCOM050086658MB2', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('revcom050086658mb2')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       180.00 · aliases: Top Part Limited
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Top Part Limited', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('top part limited')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       162.51 · aliases: WAGES W39-1-111700
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'WAGES W39-1-111700', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('wages w39 1 111700')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       160.92 · aliases: Texaco
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Texaco', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('texaco')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       150.00 · aliases: FRANCISCO ANDRES VERGARA SILVA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'FRANCISCO ANDRES VERGARA SILVA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('francisco andres vergara silva')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       137.79 · aliases: DIRETORIA GERAL DE FINANCAS
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'DIRETORIA GERAL DE FINANCAS', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('diretoria geral de financas')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       134.65 · aliases: WAGES W47-3-110040
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'WAGES W47-3-110040', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('wages w47 3 110040')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       132.08 · aliases: SALARY GALLO
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'SALARY GALLO', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('salary gallo')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       130.00 · aliases: GORDILLO RODRIGUEZ MARTA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'GORDILLO RODRIGUEZ MARTA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gordillo rodriguez marta')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       130.00 · aliases: MAQUINA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'MAQUINA', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('maquina')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       122.17 · aliases: THRIVE COFFEE LTD
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'THRIVE COFFEE LTD', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('thrive coffee ltd')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       120.00 · aliases: FLAVIO HERCULANO SOUZA DA SILVA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'FLAVIO HERCULANO SOUZA DA SILVA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('flavio herculano souza da silva')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       120.00 · aliases: SERHII KOMYSHAN
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'SERHII KOMYSHAN', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('serhii komyshan')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       115.95 · aliases: Refund from RIE Car Insurance
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Refund from RIE Car Insurance', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('refund from rie car insurance')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       110.00 · aliases: Transferência enviada pelo Pix - Gislene Aparecida Garcia (Transferência enviada) ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Transferência enviada pelo Pix - Gislene Aparecida Garcia (Transferência enviada)', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('transferencia enviada pelo pix gislene aparecida garcia transferencia enviada')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       105.00 · aliases: GABRIEL HENRIQUE DOS SANTOS, GABRIEL HENRIQUE
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'GABRIEL HENRIQUE DOS SANTOS', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel henrique'),
  ('gabriel henrique dos santos')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       103.03 · aliases: Albert Quinlan Motor Factors
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Albert Quinlan Motor Factors', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('albert quinlan motor factors')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       101.00 · aliases: ONLINE MOTOR T
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'ONLINE MOTOR T', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('online motor t')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       100.00 · aliases: Eduardo Me Que Me Mama
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Eduardo Me Que Me Mama', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('eduardo me que me mama')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       100.00 · aliases: RODOLFO HENRIQUE AYROSO RAMOS
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'RODOLFO HENRIQUE AYROSO RAMOS', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('rodolfo henrique ayroso ramos')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--       100.00 · aliases: MARTIN CORCORAN
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'MARTIN CORCORAN', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('martin corcoran')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        90.56 · aliases: CIRCLE K BALLI ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'CIRCLE K BALLI', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('circle k balli')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        90.00 · aliases: Transferência enviada pelo Pix - Nilton Jardim de Oliveira (Transferência enviada) ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Transferência enviada pelo Pix - Nilton Jardim de Oliveira (Transferência enviada)', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('transferencia enviada pelo pix nilton jardim de oliveira transferencia enviada')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        90.00 · aliases: POUPETRAN
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'POUPETRAN', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('poupetran')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        88.97 · aliases: DoneDeal
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'DoneDeal', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('donedeal')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        80.00 · aliases: REBECA MAYARA NUNES FERREIRA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'REBECA MAYARA NUNES FERREIRA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('rebeca mayara nunes ferreira')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        79.90 · aliases: Ashbourne Management
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Ashbourne Management', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('ashbourne management')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        74.85 · aliases: REFUNDED
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'REFUNDED', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('refunded')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        70.34 · aliases: MARCOS VINICIUS CARDOSO BEZERRA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'MARCOS VINICIUS CARDOSO BEZERRA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('marcos vinicius cardoso bezerra')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        70.00 · aliases: Transferência enviada pelo Pix - FIAMA FILIPIN MARQUES (Transferência enviada) ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Transferência enviada pelo Pix - FIAMA FILIPIN MARQUES (Transferência enviada)', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('transferencia enviada pelo pix fiama filipin marques transferencia enviada')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        64.00 · aliases: ANA ALINA PONCE ALVAREZ
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'ANA ALINA PONCE ALVAREZ', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('ana alina ponce alvarez')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        60.71 · aliases: CIRCLE K EASTG ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'CIRCLE K EASTG', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('circle k eastg')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        60.00 · aliases: Transferência enviada pelo Pix - VICTOR GONCALVES SAO JOSE (Transferência enviada), VICTOR GONCALVES SAO JOSE ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Transferência enviada pelo Pix - VICTOR GONCALVES SAO JOSE (Transferência enviada)', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('transferencia enviada pelo pix victor goncalves sao jose transferencia enviada'),
  ('victor goncalves sao jose')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        60.00 · aliases: LUISA JOSEFINA DI GIOVANNI PAEZ
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'LUISA JOSEFINA DI GIOVANNI PAEZ', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('luisa josefina di giovanni paez')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        60.00 · aliases: BRAYAN AUGUSTO BRANDAO
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'BRAYAN AUGUSTO BRANDAO', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('brayan augusto brandao')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        60.00 · aliases: KARCHER
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'KARCHER', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('karcher')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        57.00 · aliases: SDB COMERCIO DE ALIMENTOS LTDA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'SDB COMERCIO DE ALIMENTOS LTDA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('sdb comercio de alimentos ltda')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        55.00 · aliases: WWW NCTS IE CO
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'WWW NCTS IE CO', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('www ncts ie co')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        55.00 · aliases: Brasil
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Brasil', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('brasil')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        53.99 · aliases: Plan termination refund
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Plan termination refund', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('plan termination refund')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        53.62 · aliases: Amara Am
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Amara Am', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('amara am')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        52.00 · aliases: THAYNA MARTINS ROBIATTI
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'THAYNA MARTINS ROBIATTI', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('thayna martins robiatti')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        50.00 · aliases: TAYNA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'TAYNA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('tayna')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        48.49 · aliases: BLARNEY AUTO C
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'BLARNEY AUTO C', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('blarney auto c')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        46.70 · aliases: Antonella Estevez
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Antonella Estevez', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('antonella estevez')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        45.31 · aliases: CORK-BALLINCO
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'CORK-BALLINCO', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('cork ballinco')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        44.74 · aliases: Revpoints Spare change
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Revpoints Spare change', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('revpoints spare change')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        40.32 · aliases: AMBER SERVICE
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'AMBER SERVICE', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('amber service')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        40.00 · aliases: RENIER DE OLIVEIRA DOS SANTOS
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'RENIER DE OLIVEIRA DOS SANTOS', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('renier de oliveira dos santos')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        40.00 · aliases: LUCIA Nayeli GURDIAN ARGENAL
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'LUCIA Nayeli GURDIAN ARGENAL', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('lucia nayeli gurdian argenal')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        40.00 · aliases: CORK CITY COUN
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'CORK CITY COUN', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('cork city coun')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        35.07 · aliases: CIRCLE K TIVOL ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'CIRCLE K TIVOL', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('circle k tivol')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        35.01 · aliases: Applegreen
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Applegreen', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('applegreen')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        33.98 · aliases: Ryanair DAC
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Ryanair DAC', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('ryanair dac')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        33.85 · aliases: Transferência enviada pelo Pix - Jose Carlos de Oliveira (Transferência enviada) ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Transferência enviada pelo Pix - Jose Carlos de Oliveira (Transferência enviada)', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('transferencia enviada pelo pix jose carlos de oliveira transferencia enviada')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        30.00 · aliases: Transferência enviada pelo Pix - DEBORA BARBOSA DA SILVA (Transferência enviada) ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Transferência enviada pelo Pix - DEBORA BARBOSA DA SILVA (Transferência enviada)', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('transferencia enviada pelo pix debora barbosa da silva transferencia enviada')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        27.50 · aliases: BERNARDO NUNO MATOS VIDAL DE LIMA CASEIRO
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'BERNARDO NUNO MATOS VIDAL DE LIMA CASEIRO', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('bernardo nuno matos vidal de lima caseiro')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        26.00 · aliases: MUTUAL ENTERPR
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'MUTUAL ENTERPR', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('mutual enterpr')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        25.40 · aliases: STRIPE TECHNOLOGY
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'STRIPE TECHNOLOGY', 'cliente' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('stripe technology')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        23.00 · aliases: Hajat Gul Ahmadzai
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Hajat Gul Ahmadzai', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('hajat gul ahmadzai')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        22.66 · aliases: GABRIEL REZE
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'GABRIEL REZE', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel reze')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        20.63 · aliases: Go
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Go', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('go')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        20.00 · aliases: 30639 CIRCLE K LIMERICK ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, '30639 CIRCLE K LIMERICK', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('30639 circle k limerick')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        20.00 · aliases: ALEXANDER DELGADILLO MARISCAL
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'ALEXANDER DELGADILLO MARISCAL', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('alexander delgadillo mariscal')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        20.00 · aliases: VITOR
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'VITOR', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('vitor')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        17.51 · aliases: Guia de Moteis Go SA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Guia de Moteis Go SA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('guia de moteis go sa')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        17.00 · aliases: Transferência enviada pelo Pix - RICARDO HENRIQUE NONATO CUNHA RAMOS (Transferência enviada) ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Transferência enviada pelo Pix - RICARDO HENRIQUE NONATO CUNHA RAMOS (Transferência enviada)', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('transferencia enviada pelo pix ricardo henrique nonato cunha ramos transferencia enviada')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        15.50 · aliases: MANGOPAY
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'MANGOPAY', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('mangopay')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        15.00 · aliases: THULIO PAULO MARTINS ABREU NIGRI
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'THULIO PAULO MARTINS ABREU NIGRI', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('thulio paulo martins abreu nigri')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        15.00 · aliases: LUCAS LOURENZAO CARNEIRO
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'LUCAS LOURENZAO CARNEIRO', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('lucas lourenzao carneiro')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        15.00 · aliases: GABRIEL - WI
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'GABRIEL - WI', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel wi')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        14.00 · aliases: NYA*O'Reillys
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'NYA*O''Reillys', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('nya o reillys')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        14.00 · aliases: Maxol
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Maxol', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('maxol')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        13.80 · aliases: DIRECTROUTE (F
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'DIRECTROUTE (F', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('directroute f')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        12.50 · aliases: GABRIEL MARO
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'GABRIEL MARO', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel maro')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        12.50 · aliases: THAYN
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'THAYN', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('thayn')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        11.00 · aliases: Thayna Casa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Thayna Casa', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('thayna casa')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        10.00 · aliases: Kaique Augusto - Fut
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Kaique Augusto - Fut', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('kaique augusto fut')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--        10.00 · aliases: TAMARA SHELEN ALEGRE
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'TAMARA SHELEN ALEGRE', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('tamara shelen alegre')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         8.58 · aliases: THAYNA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'THAYNA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('thayna')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         8.50 · aliases: COOPERBARCO
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'COOPERBARCO', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('cooperbarco')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         8.00 · aliases: ELENA ROISIN DIAKOU
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'ELENA ROISIN DIAKOU', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('elena roisin diakou')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         7.16 · aliases: P & P MROZ
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'P & P MROZ', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('p p mroz')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         6.15 · aliases: CIRCLE K FRANK ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'CIRCLE K FRANK', 'vendedor' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('circle k frank')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         6.00 · aliases: XL MARINA FILL
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'XL MARINA FILL', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('xl marina fill')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         5.50 · aliases: ANDREONE RODRIGO SILVA DE ALMEIDA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'ANDREONE RODRIGO SILVA DE ALMEIDA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('andreone rodrigo silva de almeida')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         5.50 · aliases: MURILO DA CUNHA NEUHAUS
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'MURILO DA CUNHA NEUHAUS', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('murilo da cunha neuhaus')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         4.65 · aliases: LUIZ MIGUEL MAIA BASTOS DE ARAUJO
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'LUIZ MIGUEL MAIA BASTOS DE ARAUJO', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('luiz miguel maia bastos de araujo')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         4.50 · aliases: MICAELA JULIA MORETTI
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'MICAELA JULIA MORETTI', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('micaela julia moretti')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         2.85 · aliases: NYA*BDS Vendin
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'NYA*BDS Vendin', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('nya bds vendin')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         2.75 · aliases: THAYNELSON
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'THAYNELSON', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('thaynelson')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         2.64 · aliases: MICHEAL PATRICK ONEILL
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'MICHEAL PATRICK ONEILL', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('micheal patrick oneill')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         1.95 · aliases: SPAR SULLIVANS
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'SPAR SULLIVANS', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('spar sullivans')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         1.50 · aliases: CELSO CHRISTIANO SCHMIDT
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'CELSO CHRISTIANO SCHMIDT', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('celso christiano schmidt')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         1.00 · aliases: SQ *TCEA LIMIT
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'SQ *TCEA LIMIT', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('sq tcea limit')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         0.01 · aliases: Savings: Interest Adjustment 11.06.2026
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Savings: Interest Adjustment 11.06.2026', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('savings interest adjustment 11 06 2026')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--         0.00 · aliases: Closing transaction
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Closing transaction', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('closing transaction')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

