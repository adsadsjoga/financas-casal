"""
Gera o SQL que popula `counterparties` e `counterparty_aliases` a partir da aba
"Pessoas" do centralizador feito no Excel.

    python scripts/seed_pessoas_do_excel.py <caminho-do-xlsx> > seed_pessoas.sql

Roda uma vez, fora do app — por isso Python (openpyxl já está na máquina) em
vez de mais uma dependência npm num projeto que nunca lê xlsx em produção.

O SQL sai para a saída padrão de propósito: ninguém aplica sem antes ler.
Conferir principalmente os agrupamentos automáticos e a coluna `kind`, que é
palpite — ver AGRUPAMENTO e KIND abaixo.
"""

import sys
import re
import unicodedata
from collections import defaultdict

import openpyxl

# Só linhas que representam alguém do outro lado do dinheiro. "Juros",
# "Despesa" e compras de ativo (BBAS3, Tesouro RendA+) são mecânica bancária,
# não pessoa — entram como categoria no app, não aqui. Saque também não: o
# outro lado de um ATM é o próprio dono do dinheiro.
#
# A lista cresceu em 2026-08-05: o centralizador passou a rotular o tipo com
# muito mais detalhe (35 rótulos em vez de meia dúzia), e os 5 originais
# deixavam de fora justamente os compradores e vendedores de carro — as
# contrapartes que mais importam para conciliar o negócio.
TIPOS_DE_PESSOA = {
    "Transferência enviada",
    "Transferência recebida",
    "Transferência via Wise",
    "Transferência entre casal",
    "Reembolso",
    "Transferência interna",
    "Transferência interna provável",
    "Transferência a revisar",
    "Transferência pessoal a identificar",
    "Receita",
    "Receita de negócio",
    "Despesa de negócio",
    "Despesa a revisar",
    "Despesa de moradia",
    "Possível receita de carros",
    "Possível compra/custo de carro",
    "Ajuda familiar",
    "Devolução de salário",
    "Reembolso fiscal",
}

# O tipo que a própria planilha atribuiu é evidência melhor do que adivinhar
# `kind` pelo nome: ela olhou o fluxo inteiro da pessoa, não só a grafia. Por
# isso tem prioridade sobre REGRAS_KIND.
KIND_POR_TIPO = {
    "Possível receita de carros": "cliente",
    "Receita de negócio": "cliente",
    "Possível compra/custo de carro": "vendedor",
    "Despesa de negócio": "vendedor",
    "Ajuda familiar": "familiar",
    "Transferência interna": "conta_propria",
    "Transferência interna provável": "conta_propria",
    "Despesa de moradia": "senhorio",
    "Devolução de salário": "empregador",
}

# KIND: só classifica o que dá para afirmar pelo nome. O resto sai como
# 'desconhecido' de propósito — chutar "cliente" para um nome de pessoa
# qualquer criaria um dado errado que ninguém iria conferir depois.
REGRAS_KIND = [
    (r"wise|revolut bank|interactive brokers|trading ?212|ibkr|apple pay|top ?up", "conta_propria"),
    (r"\brent\b|landlord", "senhorio"),
    (r"university|college|technological", "estabelecimento"),
]


def normalizar(texto: str) -> str:
    """Espelha normalize_description() do Postgres (ver supabase/schema.sql)."""
    sem_acento = "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", sem_acento.lower())).strip()


def inferir_kind(nome_normalizado: str, tipo: str | None = None) -> str:
    if tipo in KIND_POR_TIPO:
        return KIND_POR_TIPO[tipo]
    for padrao, kind in REGRAS_KIND:
        if re.search(padrao, nome_normalizado):
            return kind
    return "desconhecido"


def mesma_pessoa(tokens_a: set[str], tokens_b: set[str]) -> bool:
    """
    AGRUPAMENTO: junta duas grafias quando uma é subconjunto da outra E as duas
    compartilham pelo menos dois tokens.

    "joana palminha" ⊂ "joana filipa costa palminha"  -> mesma pessoa
    "gabriel garcia" ⊂ "gabriel garcia de araujo"     -> mesma pessoa
    "gabriel garcia" vs "gabriel rezende teixeira"    -> só 1 token, separados

    Exigir dois tokens é o que impede que todo mundo chamado Gabriel vire a
    mesma pessoa.
    """
    compartilhados = tokens_a & tokens_b
    if len(compartilhados) < 2:
        return False
    return tokens_a <= tokens_b or tokens_b <= tokens_a


def agrupar(nomes: list[str]) -> list[tuple[list[str], bool]]:
    """
    Agrupa grafias exigindo compatibilidade com TODAS as já no grupo, não só
    com uma.

    Sem isso um nome curto vira ponte entre duas pessoas diferentes. O caso
    real que motivou a regra: "Gabriel Garcia" é subconjunto tanto de "Gabriel
    Garcia de Araujo" quanto de "GABRIEL GOMES GARCIA DA SILVEIRA", que são
    pessoas distintas — encadear por transitividade fundia as duas numa só.

    Devolve (grafias, ambiguo). `ambiguo` marca grupo que recebeu um nome que
    também servia para outro grupo: esse é exatamente o caso que precisa de
    olho humano antes de aplicar.
    """
    tokens = {n: set(normalizar(n).split()) for n in nomes}
    # Nome mais completo primeiro: os grupos nascem da grafia mais específica,
    # e as curtas se encaixam depois (ou ficam sozinhas).
    ordenados = sorted(nomes, key=lambda n: -len(tokens[n]))

    grupos: list[list[str]] = []
    ambiguos: set[int] = set()

    for nome in ordenados:
        compativeis = [
            i
            for i, grupo in enumerate(grupos)
            if all(mesma_pessoa(tokens[nome], tokens[outro]) for outro in grupo)
        ]
        if not compativeis:
            grupos.append([nome])
            continue

        grupos[compativeis[0]].append(nome)
        if len(compativeis) > 1:
            # Serviria para mais de uma pessoa — quem revisa decide.
            ambiguos.update(compativeis)

    return [(grupo, i in ambiguos) for i, grupo in enumerate(grupos)]


def escapar(texto: str) -> str:
    return texto.replace("'", "''")


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("uso: python scripts/seed_pessoas_do_excel.py <caminho-do-xlsx>")

    # No Windows a saída padrão vem em cp1252 e engasga nos acentos dos nomes.
    sys.stdout.reconfigure(encoding="utf-8")

    wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
    linhas = list(wb["Pessoas"].iter_rows(min_row=2, values_only=True))

    # Colunas: 0 titular, 1 nome, 3 tipo predominante, 4 nº transações,
    # 5 recebido, 6 enviado.
    volume: dict[str, float] = defaultdict(float)
    # Guarda o tipo da linha de maior movimento de cada grafia: a mesma pessoa
    # pode aparecer duas vezes (uma por titular) com rótulos diferentes.
    tipo_por_nome: dict[str, tuple[float, str]] = {}
    for linha in linhas:
        nome, tipo = linha[1], linha[3]
        if not nome or tipo not in TIPOS_DE_PESSOA:
            continue
        nome = str(nome).strip()
        movimento = float(linha[5] or 0) + float(linha[6] or 0)
        volume[nome] += movimento
        if movimento >= tipo_por_nome.get(nome, (-1.0, ""))[0]:
            tipo_por_nome[nome] = (movimento, str(tipo))

    grupos = agrupar(list(volume))
    # Maior movimento primeiro: quem revisar o SQL vê antes o que mais importa.
    grupos.sort(key=lambda g: -sum(volume[n] for n in g[0]))

    ambiguos = sum(1 for _, ambiguo in grupos if ambiguo)

    print("-- Gerado por scripts/seed_pessoas_do_excel.py — CONFERIR antes de rodar.")
    print("--")
    print("-- Conferir principalmente:")
    print("--   1. grafias agrupadas na mesma pessoa (bloco 'aliases:' de cada uma);")
    print("--   2. a coluna kind — quase tudo sai 'desconhecido' de propósito;")
    print(f"--   3. os {ambiguos} grupos marcados AMBIGUO: uma grafia curta servia")
    print("--      para mais de uma pessoa e caiu na de maior movimento.")
    print()

    for grupo, ambiguo in grupos:
        # O nome mais longo costuma ser o mais completo ("JOANA FILIPA COSTA
        # PALMINHA" em vez de "Joana Palminha").
        canonico = max(grupo, key=len)
        padroes = sorted({normalizar(n) for n in grupo if normalizar(n)})
        if not padroes:
            continue

        total = sum(volume[n] for n in grupo)
        # O tipo vem da grafia de maior movimento do grupo — a que a planilha
        # teve mais material para classificar.
        tipo_dominante = tipo_por_nome[max(grupo, key=lambda n: volume[n])][1]
        kind = inferir_kind(normalizar(canonico), tipo_dominante)

        marca = " ⚠ AMBIGUO — conferir se são a mesma pessoa" if ambiguo else ""
        print(f"-- {total:>12,.2f} · aliases: {', '.join(grupo)}{marca}")
        # CTE não atravessa `;` — cada bloco resolve o casal de novo. Assume um
        # casal só no banco (é o caso real deste projeto).
        print("with casal as (select id from public.couples limit 1),")
        print("nova as (")
        print("  insert into public.counterparties (couple_id, name, kind)")
        print(f"  select casal.id, '{escapar(canonico)}', '{kind}' from casal")
        print("  on conflict (couple_id, name) do update set name = excluded.name")
        print("  returning id")
        print(")")
        print("insert into public.counterparty_aliases (counterparty_id, pattern)")
        print("select nova.id, p.pattern from nova, (values")
        print(",\n".join(f"  ('{escapar(p)}')" for p in padroes))
        print(") as p(pattern)")
        print("on conflict (counterparty_id, pattern) do nothing;")
        print()


if __name__ == "__main__":
    main()
