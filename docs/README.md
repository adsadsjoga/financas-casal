# Documentação — comece por aqui

Estes arquivos existem para que qualquer um (Gabriel, Claude Code, Codex)
consiga retomar o projeto sem reler conversa antiga.

## Qual arquivo abrir

| Se você quer… | Abra |
|---|---|
| Entender o que é o app e como ele se organiza | [`visao-geral.md`](visao-geral.md) |
| Saber o que está pronto, em andamento e a fazer | [`estado-atual.md`](estado-atual.md) |
| Escrever código sem quebrar nada | [`convencoes.md`](convencoes.md) |
| Mexer no módulo de compra e venda de carros | [`carros.md`](carros.md) |
| Importar extrato ou entender as regras de dinheiro | [`dados-revolut.md`](dados-revolut.md) |
| Saber **por que** algo foi feito daquele jeito | [`decisoes.md`](decisoes.md) |
| Publicar no ar | [`../DEPLOY.md`](../DEPLOY.md) |

## Regra de manutenção

**[`estado-atual.md`](estado-atual.md) é o único arquivo que muda toda sessão.**
Quem terminar uma tarefa atualiza ele antes de encerrar — é o que evita duas
ferramentas refazerem o mesmo trabalho ou desfazerem uma a outra.

Os outros mudam pouco:
- `convencoes.md` só quando uma regra nova nascer de um bug real.
- `decisoes.md` só quando uma escolha for tomada — e nunca se apaga uma
  decisão antiga, marca-se como revertida com o motivo.

## Trabalhando em dupla (Claude Code + Codex)

O repositório é um só e as duas ferramentas escrevem nele. Para não colidir:

1. **Combine a área antes de começar.** Ex.: Codex no visual
   (`src/components/ui/`, `globals.css`), Claude no dado e na lógica
   (`src/lib/`, `src/app/*/actions.ts`, `supabase/`).
2. **Commit antes de trocar de ferramenta.** Trabalho não commitado é o que
   se perde num conflito.
3. **Anote no `estado-atual.md`** o que ficou pela metade.
