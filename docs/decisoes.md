# Decisões

Por que as coisas são como são. Serve para não rediscutir o mesmo ponto daqui
a três meses — e para saber o que se perde ao mudar de ideia.

Nunca apague uma decisão. Se for revertida, marque como revertida e explique.

---

## Banco próprio em vez de continuar no Lovable
**2026-08-01**

O protótipo guardava tudo no `localStorage`. Cada celular tinha seu próprio
banco de dados — o Gabriel e a Joana nunca veriam os mesmos números, que era
exatamente o objetivo do app. Supabase com RLS resolve isso e ainda dá
controle de quem vê o quê.

## Moeda principal EUR, com BRL suportado
**2026-08-01**

O plano original assumia BRL. Ao analisar o extrato real (Revolut, 5.258
lançamentos), todos estavam em EUR — eles moram na Irlanda. Como ainda há
movimento com o Brasil, o app ficou multi-moeda com conversão.

## Conversão congelada na data do lançamento
**2026-08-01**

A alternativa (converter na hora de exibir, com a cotação atual) faria o
gasto de março mudar sozinho toda vez que o câmbio oscilasse. Guardar
`rate_to_primary` no lançamento mantém o histórico estável, como manda a
contabilidade.

## `rate_to_primary` sem valor padrão
**2026-08-01**

Com `default 1` não haveria como distinguir "não informei a taxa" de "a taxa
é 1 mesmo". Uma despesa em real entraria valendo o mesmo número em euro.
Deixando nulo, o trigger sabe que precisa descobrir.

## Transferência entre bolsos não é despesa
**2026-08-01**

Descoberto ao analisar o extrato: de €236.907 em saídas, €170.207 (72%) era
dinheiro trocando de bolso — Pockets do Revolut, conta própria, investimento.
Importar cru diria que eles gastam €10.000/mês. O gasto real é ~€3.900/mês.
Por isso `transferencia` é um tipo separado de `despesa`.

## Saque para carro vira "Dinheiro em mãos"
**2026-08-02**

Saque do Revolut lançado como despesa contaria o gasto duas vezes (uma no
saque, outra na compra do carro) e ainda esconderia quanto dinheiro vivo
existe. Virou: saque = transferência para a conta "Dinheiro em mãos"; a
despesa acontece quando sai de lá para o carro.

## Azul/vermelho nos gráficos, não verde/vermelho
**2026-08-02**

Verde/vermelho para entrada/saída falhou o teste de separação sob
deuteranopia (ΔE 5,8, abaixo do piso de 6) — é exatamente o par que o
daltonismo vermelho-verde confunde. Azul/vermelho passa em todos os checks,
no claro e no escuro, e continua lendo como opostos.

## Recorrente não lança sozinha
**2026-08-02**

A alternativa seria um cron lançando automaticamente e uma heurística de
"a descrição parece a mesma" para saber se já foi paga. Heurística erra, e
errar aqui significa conta duplicada ou conta sumida. O usuário confirma no
botão, e a transação guarda `recurrence_id` — referência explícita não
engana.

## E-mails do resumo vêm do `auth.admin`, não de variável fixa
**2026-08-02**

Uma variável `RESUMO_EMAIL_TO` só serviria para o dono do deploy. Buscando de
`auth.admin`, cada casal recebe nos endereços reais dos dois membros — o app
continua funcionando se um dia houver mais de um casal.

## Cron responde 200 com aviso quando falta chave
**2026-08-02**

Se respondesse 500, a Vercel marcaria o cron como falhando todo dia 1º
enquanto as chaves não estivessem configuradas. Responder 200 dizendo qual
variável falta é mais honesto e não gera alarme falso.

## Service worker não cacheia página nem dado
**2026-08-01**

Cache de página em app de finanças = saldo velho na tela, e dado financeiro
gravado no aparelho. Só ícone e bundle com hash entram no cache — o
suficiente para o app ser instalável e abrir rápido.

## Testes só de lógica pura
**2026-08-01**

Os 77 testes cobrem dinheiro, datas, divisão, fatura e previsão — tudo sem
tocar no Supabase. Mock de banco dá falsa confiança (passa no teste, quebra
em produção). O banco é validado rodando o app de verdade.

---

## Em aberto

- **Módulo de carros na barra principal ou no menu "Mais"?**
  Depende de quanto o Gabriel vai usar pelo celular no dia a dia.
- **Comparar com a média dos 3 meses anteriores no resumo mensal.**
  Ficou de fora para não inflar o escopo; dá para somar depois.
