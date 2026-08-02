# Módulo de carros

Operação de compra e venda de veículos do Gabriel. Antes vivia num app
separado (Auto Tally, no Lovable); está sendo absorvida aqui para que o
dinheiro dos carros e o dinheiro da casa parem de viver em lugares
diferentes.

**Não é despesa da casa.** É atividade à parte, com lucro e prejuízo
próprios, e por isso não deve poluir o orçamento doméstico.

---

## Banco

`supabase/migrations/20260802_carros.sql` — **já aplicado** no Supabase.

| Tabela | Guarda |
|---|---|
| `vehicles` | o carro: compra, custos previstos, venda, comprador, status |
| `vehicle_costs` | cada custo lançado (mecânica, documentação, etc.) |
| `vehicle_sale_installments` | parcelas da venda, com `paid_on` quando recebida |
| `vehicle_transaction_links` | liga carro ↔ lançamento financeiro real |

`vehicle_transaction_links.role` diz o papel do lançamento: `compra`, `custo`,
`entrada`, `parcela` ou `ajuste`. É isso que permite conciliar o que saiu do
Revolut com o que aconteceu no carro.

Todas com RLS por `is_couple_member(couple_id)`.

---

## Como o dinheiro se move (regra que evita contar duas vezes)

O Gabriel opera muito em dinheiro vivo. Se o saque fosse lançado como
despesa, o gasto contaria duas vezes — uma no saque, outra na compra do
carro — e ainda ninguém saberia quanto dinheiro vivo existe.

| Aconteceu | Lança como |
|---|---|
| Saque no Revolut | **Transferência** Revolut → "Dinheiro em mãos" |
| Compra ou custo do carro em dinheiro | **Despesa** saindo de "Dinheiro em mãos", vinculada ao carro |
| Sobrou dinheiro e voltou pro banco | **Transferência** "Dinheiro em mãos" → Revolut |
| Recebeu parcela do comprador | **Receita**, vinculada ao carro |

"Dinheiro em mãos" é uma conta do tipo `dinheiro`. O app oferece criá-la na
tela de carros se ainda não existir.

---

## Histórico real (fonte de verdade)

Levantado pelo Gabriel a partir do Auto Tally em **2026-08-02**.
**Aritmética conferida** — lucro por carro, totais, custos detalhados,
percentuais por categoria e o parcelamento do Danilo, tudo fecha.

### Veículos

| Veículo | Compra | Custos | Venda | Lucro | Comprador | Situação |
|---|---:|---:|---:|---:|---|---|
| Opel Corsa 2010 | 1.050,00 | 518,60 | 2.000,00 | **+431,40** | — (à vista, 20/07) | quitado |
| Nissan Qashqai 2011 | 1.350,00 | 64,74 | 3.400,00 | **+1.985,26** | Danilo | falta 200,00 |
| Ford Focus 2010 | 700,00 | 592,66 | 2.900,00 | **+1.607,34** | Irene | quitado |
| Nissan Qashqai 2010 | 1.500,00 | 0 | 3.350,00 | **+1.850,00** | Cris | quitado (9/9) |
| Ford Ka 2010 | 1.600,00 | 0 | 2.900,00 | **+1.300,00** | Kelly | quitado (12/12) |
| Honda IX35 2012 | 3.100,00 | 1.302,40 | 4.700,00 | **+297,60** | Pablo | quitado (10/10) |

Valores em EUR. Todos os 6 estão **vendidos** — não há carro em estoque.

> Atenção: um resumo anterior do Auto Tally dizia "1 carro em estoque" com o
> Opel Corsa a vender por 2.900. Ele foi vendido por **2.000 à vista em
> 20/07**, e o lucro real caiu de 1.331,40 para **431,40**. O número certo é
> o desta tabela.

### Totais

- Compras: **9.300,00** · Custos: **2.478,40** · Investido: **11.778,40**
- Vendas: **19.250,00** · **Lucro: 7.471,60** (margem 38,8%)
- A receber: **200,00** (última parcela do Danilo, vence 08/08) · nada atrasado

Lucro por mês de venda: Fev 1.850 · Mar 1.300 · Abr 1.607,34 ·
Mai 2.282,86 · Jul 431,40

### Custos lançados (9 no total)

| Carro | Data | Categoria | Descrição | Valor |
|---|---|---|---|---:|
| Honda IX35 2012 | 03/04 | Mecânica | Peças | 580,00 |
| Honda IX35 2012 | 05/04 | Mecânica | Trabalho | 452,40 |
| Honda IX35 2012 | 10/04 | Mecânica | Pneu | 120,00 |
| Honda IX35 2012 | 02/05 | Outro | Bateria | 150,00 |
| Ford Focus 2010 | 20/03 | Mecânica | Carro | 592,66 |
| Opel Corsa 2010 | 26/05 | Mecânica | Peças | 41,60 |
| Opel Corsa 2010 | 13/06 | Mecânica | Mecânico | 477,00 |
| Nissan Qashqai 2011 | 27/04 | Outro | Lavajato | 12,00 |
| Nissan Qashqai 2011 | 17/05 | Outro | Volta de Waterford | 52,74 |

Por categoria: Mecânica **2.263,66** (91,3%) · Outro **214,74** (8,7%).
Estética, Documentação e Multas: zero.

Custo médio por veículo: 413,07 — entre os 4 que tiveram custo: 619,60.
Mês de maior gasto: abril (1.152,40, quase todo do IX35).

### Venda parcelada — Nissan Qashqai 2011 (Danilo)

Entrada 1.000 + 12 × 200 = 3.400 (fecha com o preço de venda).
Recebidas 11 (3.200). **Falta a 12ª, de 200, vencendo 08/08.**

---

## Conciliação com o extrato Revolut

Feita em **2026-08-02** sobre o extrato de 2024-08 a 2026-08.

### Compras encontradas

| Carro | Valor | Lançamento no Revolut |
|---|---:|---|
| Honda IX35 2012 | 3.100,00 | 2026-03-22 · Transfer to KAMELIA KHALFI |
| Ford Ka 2010 | 1.600,00 | 2026-03-07 · Transfer to THOMAS PATRICK ENRIGHT |
| Nissan Qashqai 2010 | 1.500,00 | 2026-02-01 · Transfer to JAMIE SLATER |
| Ford Focus 2010 | 700,00 | 2026-03-14 · Transfer to GERALDINE MARY MULLANE |
| Opel Corsa 2010 | 1.050,00 | **não achado** — provavelmente dinheiro vivo |
| Nissan Qashqai 2011 | 1.350,00 | **não achado** — provavelmente dinheiro vivo |

### Custos encontrados

| Carro | Custo | Lançamento |
|---|---:|---|
| Honda IX35 · Peças | 580,00 | 2026-03-27 · Marius Garage |
| Honda IX35 · Trabalho | 452,40 | 2026-04-08 · Marius Garage |
| Honda IX35 · Pneu | 120,00 | 2026-04-11 · Brendan Walsh Tyres |
| Honda IX35 · Bateria | 150,00 | 2026-05-02 · Top Part Limited |
| Qashqai 2011 · Lavajato | 12,00 | 2026-04-03 · SuperValu |
| Ford Focus · Carro | 592,66 | **não achado** |
| Opel Corsa · Peças | 41,60 | **não achado** |
| Opel Corsa · Mecânico | 477,00 | **não achado** |
| Qashqai 2011 · Waterford | 52,74 | **não achado** |

Os 4 não achados somam **1.164,00** e provavelmente saíram em dinheiro vivo.
Há **1.370,00 sacado** em 9 saques no período (750,00 em fev/2025; 300,00 em
mai/2026; o resto pulverizado) — compatível, mas não dá para provar a ligação
sem o Gabriel confirmar.

### Recebimentos dos compradores

| Comprador | Carro | Recebido no Revolut | Venda |
|---|---|---:|---:|
| Danilo Rocha da Silva | Qashqai 2011 | 2.678,00 (12 transferências) | 3.400,00 |
| Irene Benitez Suarez | Ford Focus | 2.900,00 (à vista, 09/04) | 2.900,00 |
| Cristiane Alves Gonçalves | Qashqai 2010 | ~2.870,00 | 3.350,00 |
| Kelly Cristina Dias Pereira | Ford Ka | 2.901,85 | 2.900,00 |
| Pablo Nogueira Costa Oliveira | Honda IX35 | 2.300,00 (7 parcelas) | 4.700,00 |

A diferença entre recebido e venda é entrada paga em dinheiro — exceto Irene,
que pagou tudo por transferência.

---

## An Post — a taxa de troca de nome

Existem **20 lançamentos An Post** no extrato, somando **59,05**. Em 2026
(ano de todas as vendas) são **14 lançamentos, 45,50**:

| Valor | Vezes | Provável |
|---:|---:|---|
| 1,85 | 9 | selo comum — é o valor que mais repete |
| 14,00 | 1 | 2026-03-20 |
| 5,50 | 1 | 2026-03-10 |
| 4,00 | 1 | 2026-04-11 |
| 3,70 | 1 | 2026-07-15 (= 2 × 1,85) |
| 1,65 | 1 | 2026-01-28 |

**Nenhum desses está lançado como custo de carro no Auto Tally.**

As vendas aconteceram em fev, mar, abr, mai, mai e jul de 2026 — e há An Post
em todos esses meses, o que é consistente com a taxa de troca de nome. Mas
o Gabriel também usa An Post para correspondência comum, então **não dá para
separar automaticamente** qual selo foi de carro e qual foi pessoal.

Isso precisa da confirmação dele antes de virar custo — ver "Perguntas em
aberto" no fim deste arquivo.

Existem ainda dois **Motor Tax Online**: 108,00 (2025-01-07) e 153,00
(2025-12-03). São imposto de circulação, não troca de nome, e as datas não
batem com as vendas — provavelmente do carro pessoal.

---

## O que falta fazer

- [ ] **Carregar estes dados no Supabase** — nenhum destes 6 carros existe no
      banco ainda
- [ ] **Ligar os lançamentos já identificados** via `vehicle_transaction_links`
      (as compras e custos da tabela de conciliação acima)
- [ ] **Confirmar com o Gabriel quais An Post são de carro** e lançar como
      custo de Documentação
- [ ] Criar e editar venda com comprador e parcelas pela interface
- [ ] Dar baixa em parcela recebida (hoje só dá para ver as pendentes)
- [ ] Sugerir vínculo automático entre saque/depósito e carro
- [ ] Tela de conciliação: carros × Revolut × dinheiro em mãos
- [ ] Decidir se "Carros" sai do menu "Mais" para a barra principal

## Código

```
src/app/(app)/carros/
  page.tsx                    lista, com abas estoque/vendidos
  carros-client.tsx           cards de estoque, lucro projetado/realizado, a receber
  actions.ts                  salvar carro, custo, vínculo, criar "Dinheiro em mãos"
  novo/  novo-carro-form.tsx  cadastro
  [id]/  carro-detalhe-client.tsx   detalhe, custos, vínculos
```

Tipos em `src/lib/database.types.ts`: `Vehicle`, `VehicleCost`,
`VehicleInstallment`, `VehicleStatus`.

**Pendência conhecida:** 47 acentos deste módulo estão como `?` literal
(`"Finan?as do Casal"`, `"Pre?o de compra inv?lido"`). Ver regra 3 em
[`../AGENTS.md`](../AGENTS.md).

---

## Perguntas em aberto (precisam do Gabriel)

1. **Quais lançamentos An Post foram troca de nome de veículo?**
   Os de valor incomum são os candidatos mais fortes: 14,00 (20/03),
   5,50 (10/03), 4,00 (11/04), 3,70 (15/07). Os de 1,85 se repetem 9 vezes
   e provavelmente misturam selo pessoal com selo de carro.
2. **Os 1.164,00 em custos não achados saíram dos saques em dinheiro?**
   (Focus 592,66 · Corsa 41,60 e 477,00 · Waterford 52,74)
3. **As compras do Opel Corsa (1.050) e do Qashqai 2011 (1.350) foram em
   dinheiro?** Não aparecem no Revolut.
4. **As entradas pagas em dinheiro pelos compradores** — a diferença entre o
   recebido no Revolut e o preço de venda — foram depositadas de volta ou
   ficaram em espécie?
