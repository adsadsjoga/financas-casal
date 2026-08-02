# Dados e importação

Como o dinheiro real do Gabriel e da Joana se comporta, e o que isso exige do
app. Baseado na análise do extrato Revolut de **2024-08 a 2026-08**
(5.258 lançamentos, todos em EUR).

## A descoberta que mudou o app

De **236.907** em saídas no extrato, **170.207 (72%) não é gasto** — é
dinheiro trocando de bolso:

| Movimento | Valor |
|---|---:|
| Pockets do Revolut (Carros, Reserva, Aluguel, Brasil, Voos) | 138.236 |
| Entre contas próprias (AIb, Wise) | 16.499 |
| Para investimento (IBKR, Trading 212, Savings Vault) | 14.949 |

Importar isso como despesa diria que eles gastam ~10.000/mês. **O gasto real
é ~3.900/mês.** Por isso `transferencia` existe como tipo separado: o valor
continua batendo o saldo, mas some do gráfico de despesas.

## Regras de classificação

### Sempre transferência, nunca despesa

- `To EUR <bolso>` / `From EUR <bolso>` — Pockets do Revolut
- `Savings Vault topup`, `To investment account`, `To IBKR`, `Trading 212`
- Transferências para contas do próprio Gabriel (AIb, Wise)
- `Apple Pay top-up` — recarga da própria conta
- **Saque em dinheiro** → vira "Dinheiro em mãos" (ver abaixo)

### Dinheiro vivo

O Gabriel opera muito em espécie, principalmente nos carros. Lançar saque
como despesa contaria o gasto duas vezes e esconderia quanto dinheiro existe.

| Aconteceu | Lança como |
|---|---|
| Saque no ATM | Transferência Revolut → "Dinheiro em mãos" |
| Gastou o dinheiro | Despesa saindo de "Dinheiro em mãos" |
| Depositou de volta | Transferência "Dinheiro em mãos" → Revolut |

No período há **1.370,00 em 9 saques**.

### Joana

274 lançamentos com JOANA FILIPA COSTA PALMINHA — 9.722 saindo, 7.660
entrando, nos dois sentidos. **Não é despesa nem receita: é acerto de contas
entre o casal.** Se entrasse como gasto, inflaria artificialmente tanto a
renda quanto a despesa dos dois.

### Carros

`To EUR Carros` / `From EUR Carros` movimenta ~48.000 em cada direção. É o
bolso da operação de veículos — transferência, não gasto. Os carros em si
vivem no módulo próprio ([`carros.md`](carros.md)).

## Para onde o dinheiro realmente vai

Gasto real de consumo, 2 anos:

| Categoria | Valor | Observação |
|---|---:|---|
| Mercado | 6.120 | 448 compras — Tesco, ALDI, Lidl, Dunnes |
| Moradia | 4.724 | Michael Rent + casa |
| Compras | 4.218 | Amazon, Vinted, Temu, Sports Direct |
| Carro (oficina) | 2.776 | Marius Garage, Sebastians Garage |
| Viagem | 2.415 | Ryanair, Airbnb, Booking |
| Educação | 2.200 | College of Technology, Limerick Language, autoescola |
| Seguros | 2.090 | 123.ie — anual, cai de uma vez |
| Transporte | 1.893 | metade combustível, metade transporte público |
| Telefone/internet | 1.803 | Vodafone, ~95/mês |
| Alimentação fora | 532 | baixo — comem em casa |

**Recorrentes confirmadas** (6+ meses distintos): Vodafone ~95/mês ·
ChatGPT ~23/mês · Facebook Ads (66 lançamentos) · 123.ie anual.

**Entrada principal:** `Payment from DOUGLAS ENGRAVING & DESIGN` —
20.365 em 54 pagamentos.

## Importador

`src/lib/import/` — OFX e CSV. Detalhes de uso em
[`../DEPLOY.md`](../DEPLOY.md) e na própria tela `/importar`.

- **OFX é o formato preferido**: traz `FITID`, um ID único por lançamento, o
  que torna a deduplicação exata.
- **CSV** pede mapeamento de colunas (o app sugere pelo cabeçalho) e formato
  de data.
- **Dedup em 3 camadas:** hash do arquivo · `external_id` (FITID) ·
  fingerprint (conta + data + valor + descrição normalizada). Há também
  checagem **dentro do próprio arquivo** — duas compras idênticas no mesmo
  dia no mesmo extrato eram contadas como duas linhas novas antes disso.
- **Regras que aprendem:** ao corrigir a categoria de um lançamento
  importado, o app oferece "lembrar essa" e grava em `import_rules`. Na
  próxima importação já vem classificado.
- **O arquivo é descartado** depois de processado. Só os lançamentos ficam.

## Cuidado ao reimportar

O extrato tem **71 lançamentos `REVERTED`** que devem ser ignorados, e
**17 `Card Refund`** que são estorno (entram positivos no cartão).
