# Estado atual

> Atualizado em **2026-08-02**.
> Quem terminar uma tarefa atualiza este arquivo antes de encerrar a sessão.

## Resumo em uma linha

App no ar e em uso real pelos dois. As 11 peças do plano original estão
prontas. O módulo de carros tem banco e primeira tela, mas ainda **sem os
dados reais** — é a frente aberta principal.

---

## Pronto e em uso

| Área | Situação |
|---|---|
| Login, cadastro, convite do casal | Funciona; os dois já estão dentro |
| Contas (individual, conjunta, privada) | Conta privada some de verdade para o parceiro |
| Multi-moeda EUR + BRL | Conversão congelada na data do lançamento |
| Transações, parcelamento, divisão | Divisão meio a meio ou por renda |
| Importar extrato OFX/CSV | Testado com arquivo real; dedup em 3 camadas |
| Fatura de cartão | Ciclo, parcelas futuras, pagar como transferência |
| Dashboard com gráficos | Entradas × saídas (6 meses) e despesas por categoria |
| Acerto de contas | Quem deve quanto, com botão de quitar |
| Orçamentos e metas | Limite por categoria; metas com aporte de cada um |
| Contas fixas | Recorrentes + previsão de saldo até o fim do mês |
| Resumo mensal por e-mail | Código pronto; **falta configurar as 3 chaves** (ver DEPLOY.md §5) |
| PWA + tema escuro | Instalável no celular; ícone próprio |

---

## Em andamento

### Módulo de carros
Banco criado e aplicado (`supabase/migrations/20260802_carros.sql`), primeira
tela publicada. Detalhes e dados reais em [`carros.md`](carros.md).

**Falta:**
- [ ] Carregar os 6 carros reais no Supabase (dados já levantados em `carros.md`)
- [ ] Cruzar com o extrato Revolut para achar compras, custos e recebimentos
- [ ] Procurar taxas do **An Post** (troca de nome do veículo) que não estão
      lançadas como custo — o Gabriel confirma que sempre existe essa taxa
- [ ] Criar/editar venda com comprador e parcelas pela interface
- [ ] Dar baixa em parcela recebida
- [ ] Sugerir vínculo automático entre saque/depósito Revolut e carro
- [ ] Decidir se "Carros" sai do menu "Mais" para a barra principal

### Design
O Gabriel está mexendo no visual com o Codex. Área dele:
`src/components/ui/`, `globals.css`, layout das telas.

---

## A fazer

- [ ] **Corrigir 49 acentos virados `?`** — texto que aparece na tela, tipo
      `"Finan?as do Casal"` e `"Pre?o de compra inv?lido"`. 47 estão no módulo
      de carros. Ver regra 3 em [`../AGENTS.md`](../AGENTS.md).
- [ ] Ativar o resumo mensal (3 variáveis de ambiente — DEPLOY.md §5)
- [ ] Rotacionar a chave `service_role` do Supabase — foi exposta em conversa
- [ ] Repositório privado no GitHub + deploy automático a cada push
- [ ] Comparação com média dos 3 meses anteriores no resumo mensal
      (deixado de fora de propósito para não inflar o escopo)

---

## Contexto útil

- **Trabalho não commitado é frágil.** Duas ferramentas escrevem no mesmo
  repositório; commite antes de trocar.
- **Deploy é manual:** `npx vercel --prod`. Já aconteceu de o Gabriel testar
  em produção uma tela que só existia local e achar que estava quebrada.
- Depois de trocar o ícone, iOS e Android seguram o antigo em cache — remover
  e adicionar o app de novo na tela inicial resolve.
