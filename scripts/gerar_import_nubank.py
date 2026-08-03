"""
Gera o SQL que importa o extrato do Nubank (BRL) para o app.

    python scripts/gerar_import_nubank.py <pasta-com-os-CSVs> > subir_nubank.sql

Roda uma vez, fora do app — mesmo padrão dos imports de Revolut/AIB/Wise que
já foram feitos por SQL em `Documents\\Contas casal`.

DECISÕES QUE ESTE SCRIPT TOMA (e por quê):

* **Uma conta só, não duas.** O Excel separava "Nubank Conta" de "Nubank
  Investimentos", mas os 23 CSVs são um extrato só, da conta corrente — as
  compras de ativo aparecem ali como saída de dinheiro. Criar uma segunda
  conta exigiria inventar as duas pontas de cada aplicação. Aqui elas entram
  como despesa categorizada "Investimentos", que é o que o app já faz do lado
  EUR (ver HANDOFF_CLAUDE_CONCILIACAO.md).

* **`rate_to_primary` fica nulo.** O trigger `transactions_before_write()`
  busca a cotação BRL→EUR do dia em `exchange_rates`. Por isso o SQL popula a
  série histórica ANTES dos lançamentos — assim cada transação congela a
  cotação da própria data, em vez de todas usarem a de hoje.

* **`external_id` = coluna `Identificador`.** É único por lançamento, então a
  dedup vira exata: rodar o script duas vezes não duplica nada.

* **`needs_review`** marca o que caiu em categoria genérica, para aparecer na
  fila de `/revisar` em vez de passar despercebido.
"""

import sys
import csv
import glob
import json
import os
import re
import urllib.request

# Ordem importa: a primeira regra que casar vence.
REGRAS = [
    (r"compra de (ações|fii|etf)|aplicaç|resgate rdb|tesouro|nuinvest|irrf sobre resgate|devolução - aplicação", "Investimentos"),
    (r"pagamento de fatura", "Transferências internas"),
    (r"wise brasil", "Transferências internas"),
    (r"gabriel garcia de araujo", "Transferências internas"),
    (r"compra no débito.*(supermerc|mercado|hiper|cooperbarco|makabe|sdb comercio|alimentos)", "Mercado"),
    (r"compra no débito.*(restaurante|pastelaria|pasteis|café|cafe|boteco|gastronomia|rotisse|lagonesia)", "Alimentação"),
    (r"(farmacia|farmavan|drogasil|raia)", "Saúde"),
    (r"telecom", "Telefone e internet"),
]

CATEGORIA_GENERICA = {"despesa": "Outras despesas", "receita": "Outras receitas"}

FRANKFURTER = "https://api.frankfurter.dev/v1"


def escapar(texto: str) -> str:
    return texto.replace("'", "''")


def iso(data_br: str) -> str:
    dia, mes, ano = data_br.strip().split("/")
    return f"{ano}-{mes.zfill(2)}-{dia.zfill(2)}"


def categorizar(descricao: str, tipo: str) -> tuple[str, bool]:
    """Devolve (nome_da_categoria, precisa_revisar)."""
    alvo = descricao.lower()
    for padrao, categoria in REGRAS:
        if re.search(padrao, alvo):
            return categoria, False
    return CATEGORIA_GENERICA[tipo], True


def ler_linhas(pasta: str) -> list[dict]:
    """Lê todos os CSVs, deduplicando pelo Identificador do próprio Nubank."""
    por_id: dict[str, dict] = {}
    arquivos = sorted(glob.glob(os.path.join(pasta, "NU_*.csv")))
    if not arquivos:
        sys.exit(f"nenhum CSV NU_*.csv em {pasta}")

    for caminho in arquivos:
        with open(caminho, encoding="utf-8-sig") as fh:
            for linha in csv.DictReader(fh):
                if linha.get("Identificador"):
                    por_id.setdefault(linha["Identificador"], linha)

    print(f"-- {len(arquivos)} arquivos lidos, {len(por_id)} lançamentos únicos.", file=sys.stderr)
    return sorted(por_id.values(), key=lambda r: iso(r["Data"]))


def cotacoes(de: str, ate: str) -> dict[str, float]:
    """Série BRL→EUR do Frankfurter (BCE), a mesma fonte que o app usa."""
    url = f"{FRANKFURTER}/{de}..{ate}?base=BRL&symbols=EUR"
    # Sem User-Agent o Frankfurter devolve 403 pro urllib puro (mas aceita o
    # curl da checagem manual, que já foi feita antes de escrever isto).
    req = urllib.request.Request(url, headers={"User-Agent": "financas-casal-import/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resposta:
        dados = json.load(resposta)
    return {dia: taxas["EUR"] for dia, taxas in dados.get("rates", {}).items() if taxas.get("EUR")}


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")

    if len(sys.argv) < 2:
        sys.exit("uso: python scripts/gerar_import_nubank.py <pasta-com-os-CSVs>")

    linhas = ler_linhas(sys.argv[1])
    primeira, ultima = iso(linhas[0]["Data"]), iso(linhas[-1]["Data"])
    taxas = cotacoes(primeira, ultima)

    print("-- Importação do Nubank (BRL) — gerado por scripts/gerar_import_nubank.py")
    print(f"-- {len(linhas)} lançamentos, de {primeira} a {ultima}.")
    print("--")
    print("-- Rodar INTEIRO de uma vez no SQL Editor do Supabase. É idempotente:")
    print("-- a dedup usa o Identificador do Nubank como external_id.")
    print()
    print("begin;")
    print()

    print("-- 1. Cotações BRL->EUR do período (BCE via Frankfurter). Precisam vir")
    print("--    antes: o trigger lê daqui para congelar a taxa de cada lançamento.")
    print("insert into public.exchange_rates (base, quote, day, rate) values")
    print(
        ",\n".join(
            f"  ('BRL', 'EUR', '{dia}', {taxa})" for dia, taxa in sorted(taxas.items())
        )
    )
    print("on conflict (base, quote, day) do update set rate = excluded.rate;")
    print()

    print("-- 2. A conta. Saldo inicial zero: o extrato não traz saldo de abertura,")
    print("--    então o saldo do app é o acumulado dos lançamentos. Ajustar depois")
    print("--    pela tela de contas quando o Gabriel confirmar o saldo real.")
    print("--")
    print("--    `accounts` não tem unique constraint em (couple_id, name) — só a")
    print("--    chave primária — então `on conflict do nothing` NÃO pegaria uma")
    print("--    conta duplicada. O `where not exists` é o que garante rodar duas")
    print("--    vezes sem criar duas contas 'Nubank'.")
    print("""insert into public.accounts
  (couple_id, name, type, currency, owner_profile_id, initial_balance_cents, color)
select c.id, 'Nubank', 'banco', 'BRL', m.profile_id, 0, '#8b5cf6'
from public.couples c
join public.couple_members m on m.couple_id = c.id
join public.profiles p on p.id = m.profile_id
where p.display_name ilike 'gabriel%'
  and not exists (
    select 1 from public.accounts a where a.couple_id = c.id and a.name = 'Nubank'
  );""")
    print()

    print("-- 3. Categorias que o import usa, caso ainda não existam.")
    print("insert into public.categories (couple_id, name, kind, icon)")
    print("select c.id, v.name, v.kind::public.category_kind, v.icon")
    print("from public.couples c, (values")
    fixas = [
        ("Investimentos", "despesa", "📈"),
        ("Investimentos", "receita", "📈"),
        ("Transferências internas", "despesa", "🔄"),
        ("Transferências internas", "receita", "🔄"),
        ("Mercado", "despesa", "🛒"),
        ("Alimentação", "despesa", "🍽️"),
        ("Saúde", "despesa", "💊"),
        ("Telefone e internet", "despesa", "📱"),
        ("Outras despesas", "despesa", "📦"),
        ("Outras receitas", "receita", "📦"),
    ]
    print(",\n".join(f"  ('{n}', '{k}', '{i}')" for n, k, i in fixas))
    print(") as v(name, kind, icon)")
    print("on conflict do nothing;")
    print()

    print("-- 4. Os lançamentos.")
    print("""with conta as (select id, couple_id from public.accounts where name = 'Nubank' limit 1),
     autor as (
       select m.profile_id from public.couple_members m
       join public.profiles p on p.id = m.profile_id
       where p.display_name ilike 'gabriel%' limit 1
     )
insert into public.transactions
  (couple_id, account_id, category_id, created_by, payer_profile_id, type,
   amount_cents, rate_to_primary, description, occurred_on, external_id, needs_review)
select conta.couple_id, conta.id,
       (select cat.id from public.categories cat
         where cat.couple_id = conta.couple_id
           and cat.name = v.categoria
           and cat.kind = v.tipo::public.category_kind
         limit 1),
       autor.profile_id, autor.profile_id, v.tipo::public.tx_type,
       v.centavos, null, v.descricao, v.data::date, v.external_id, v.revisar
from conta, autor, (values""")

    valores = []
    revisar_n = 0
    for linha in linhas:
        valor = float(linha["Valor"])
        if valor == 0:
            continue
        tipo = "receita" if valor > 0 else "despesa"
        centavos = int(round(abs(valor) * 100))
        categoria, revisar = categorizar(linha["Descrição"], tipo)
        if revisar:
            revisar_n += 1
        valores.append(
            f"  ('{iso(linha['Data'])}', '{tipo}', {centavos}, "
            f"'{escapar(linha['Descrição'])}', '{escapar(linha['Identificador'])}', "
            f"'{categoria}', {str(revisar).lower()})"
        )

    print(",\n".join(valores))
    print(") as v(data, tipo, centavos, descricao, external_id, categoria, revisar)")
    print("on conflict (account_id, external_id) where external_id is not null do nothing;")
    print()
    print("commit;")
    print()
    print("-- Conferência depois de rodar:")
    print("""-- select a.name, count(*) as lancamentos,
--        sum(case when t.type='receita' then t.amount_cents else -t.amount_cents end)/100.0 as saldo_brl
-- from public.transactions t join public.accounts a on a.id = t.account_id
-- where a.name = 'Nubank' group by a.name;""")

    print(
        f"-- {len(valores)} lançamentos; {revisar_n} caíram em categoria genérica "
        f"e vão aparecer em /revisar.",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
