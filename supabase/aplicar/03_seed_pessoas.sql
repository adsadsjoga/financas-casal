-- Gerado por scripts/seed_pessoas_do_excel.py — CONFERIR antes de rodar.
--
-- Conferir principalmente:
--   1. grafias agrupadas na mesma pessoa (bloco 'aliases:' de cada uma);
--   2. a coluna kind — quase tudo sai 'desconhecido' de propósito;
--   3. os 17 grupos marcados AMBIGUO: uma grafia curta servia
--      para mais de uma pessoa e caiu na de maior movimento.

--    73,602.78 · aliases: JOANA FILIPA COSTA PALMINHA, Joana Palminha ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'JOANA FILIPA COSTA PALMINHA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('joana filipa costa palminha'),
  ('joana palminha')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--    40,662.33 · aliases: Gabriel Garcia de Araujo, GABRIEL GARCIA DE ARAUJO, Gabriel Garcia De Araujo ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Gabriel Garcia de Araujo', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel garcia de araujo')
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

--    10,062.69 · aliases: Apple Pay top-up by *7734, Top Up
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

--     6,177.35 · aliases: Gabriel Garcia AIb ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Gabriel Garcia AIb', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel garcia aib')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     6,037.70 · aliases: Sonia Maria Ferreira Costa, SONIA MARIA FERREIRA COSTA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Sonia Maria Ferreira Costa', 'desconhecido' from casal
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
  select casal.id, 'GABRIEL GOMES GARCIA DA SILVEIRA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('gabriel garcia'),
  ('gabriel gomes garcia da silveira')
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
  select casal.id, 'Patrick Dacio Ferreira', 'desconhecido' from casal
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
  select casal.id, 'KAMELIA KHALFI', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('kamelia khalfi')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     3,000.00 · aliases: Atlantic Technological University ATU
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Atlantic Technological University ATU', 'estabelecimento' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('atlantic technological university atu')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     2,901.85 · aliases: KELLY CRISTINA DIAS PEREIRA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'KELLY CRISTINA DIAS PEREIRA', 'desconhecido' from casal
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
  select casal.id, 'JAKSON DE SOUZA SANTOS', 'desconhecido' from casal
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
  select casal.id, 'IRENE BENITEZ SUAREZ', 'desconhecido' from casal
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
  select casal.id, 'CRISTIANE ALVES GONCALVES', 'desconhecido' from casal
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
  select casal.id, 'NAUAN CABRINI', 'desconhecido' from casal
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
  select casal.id, 'DANILO ROCHA DA SILVA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('danilo rocha da silva')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     2,300.00 · aliases: PABLO NOGUEIRA COSTA OLIVEIRA
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'PABLO NOGUEIRA COSTA OLIVEIRA', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('pablo nogueira costa oliveira')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,932.79 · aliases: INTERACTIVE BROKERS IRELAND LIMITED
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'INTERACTIVE BROKERS IRELAND LIMITED', 'conta_propria' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('interactive brokers ireland limited')
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
  select casal.id, 'FERNANDO MIGUEL AMORIM CARRAPICO SERINA', 'desconhecido' from casal
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
  select casal.id, 'MINDAUGAS PASKEVICIUS', 'desconhecido' from casal
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
  select casal.id, 'JESUS DOMINGO MIGUEL CASANOVA', 'desconhecido' from casal
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
  select casal.id, 'THOMAS PATRICK ENRIGHT', 'desconhecido' from casal
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
  select casal.id, 'ANA MARTINEZ ALVAREZ', 'desconhecido' from casal
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
  select casal.id, 'JAMIE SLATER', 'desconhecido' from casal
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

--     1,432.30 · aliases: Dr John Clarke
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Dr John Clarke', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('dr john clarke')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,350.00 · aliases: Internacional College Of Technology
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Internacional College Of Technology', 'estabelecimento' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('internacional college of technology')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,300.00 · aliases: MARGARET PAULINE SUTTON
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'MARGARET PAULINE SUTTON', 'desconhecido' from casal
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
  select casal.id, 'DARRA O''CONNELL', 'desconhecido' from casal
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
  select casal.id, 'MAYCON WILLIAM ALVES BARBOSA', 'desconhecido' from casal
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
  select casal.id, 'ESTEFANIA TORRES ESQUIVEL', 'desconhecido' from casal
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
  select casal.id, 'MARTIN SAMAGLO', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('martin samaglo')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,193.86 · aliases: 123 Money
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, '123 Money', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('123 money')
) as p(pattern)
on conflict (counterparty_id, pattern) do nothing;

--     1,118.00 · aliases: Joana Palminha irl ⚠ AMBIGUO — conferir se são a mesma pessoa
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Joana Palminha irl', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('joana palminha irl')
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

--       850.00 · aliases: Limerick Language Centre Limerick Language Centre
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'Limerick Language Centre Limerick Language Centre', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('limerick language centre limerick language centre')
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

--       165.64 · aliases: RAIA DROGASIL S A
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'RAIA DROGASIL S A', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('raia drogasil s a')
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

--        10.00 · aliases: GLAMIRA*London
with casal as (select id from public.couples limit 1),
nova as (
  insert into public.counterparties (couple_id, name, kind)
  select casal.id, 'GLAMIRA*London', 'desconhecido' from casal
  on conflict (couple_id, name) do update set name = excluded.name
  returning id
)
insert into public.counterparty_aliases (counterparty_id, pattern)
select nova.id, p.pattern from nova, (values
  ('glamira london')
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

