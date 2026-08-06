"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCheck,
  FileUp,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { ListCard } from "@/components/app/list-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { dataBR } from "@/lib/dates";
import { sugerirColunas, type FormatoData } from "@/lib/import/csv";
import { TIPOS_CONTA } from "@/lib/constants";
import type { Account, Category, ImportSource } from "@/lib/database.types";

import {
  analisarCsv,
  analisarOfx,
  confirmarImportacao,
  criarRegraCategoria,
  type PreviewRow,
} from "./actions";

type Etapa = "upload" | "mapear" | "revisao";

const FORMATOS_DATA: { valor: FormatoData; label: string }[] = [
  { valor: "DMY", label: "DD/MM/AAAA (Brasil, Irlanda…)" },
  { valor: "MDY", label: "MM/DD/AAAA (EUA)" },
  { valor: "YMD", label: "AAAA-MM-DD (ISO)" },
];

export function ImportarClient({
  contas,
  categorias,
  moedaCasal,
}: {
  contas: Account[];
  categorias: Category[];
  moedaCasal: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendente, startTransition] = useTransition();

  const [etapa, setEtapa] = useState<Etapa>("upload");
  const [accountId, setAccountId] = useState(contas[0]?.id ?? "");
  const [arquivo, setArquivo] = useState<{
    nome: string;
    texto: string;
  } | null>(null);
  const [formato, setFormato] = useState<ImportSource>("csv");

  // mapeamento csv
  const [amostra, setAmostra] = useState<string[][]>([]);
  const [temCabecalho, setTemCabecalho] = useState(true);
  const [dataCol, setDataCol] = useState("0");
  const [descCol, setDescCol] = useState("1");
  const [valorCol, setValorCol] = useState("2");
  /** "-1" = o extrato não tem coluna de ID. */
  const [idCol, setIdCol] = useState("-1");
  const [inverterSinal, setInverterSinal] = useState(false);
  const [formatoData, setFormatoData] = useState<FormatoData>("DMY");

  // resultado da análise
  const [fileHash, setFileHash] = useState("");
  const [jaImportado, setJaImportado] = useState(false);
  const [linhasIgnoradas, setLinhasIgnoradas] = useState(0);
  const [linhas, setLinhas] = useState<PreviewRow[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [categoriaPorLinha, setCategoriaPorLinha] = useState<
    Record<string, string>
  >({});
  const [descricaoPorLinha, setDescricaoPorLinha] = useState<
    Record<string, string>
  >({});
  const [lembradas, setLembradas] = useState<Set<string>>(new Set());
  const [limiteRevisao, setLimiteRevisao] = useState(250);

  const conta = contas.find((c) => c.id === accountId);
  const moedaConta = conta?.currency ?? moedaCasal;

  function limparTudo() {
    setEtapa("upload");
    setArquivo(null);
    setAmostra([]);
    setLinhas([]);
    setSelecionadas(new Set());
    setCategoriaPorLinha({});
    setDescricaoPorLinha({});
    setLembradas(new Set());
    setLimiteRevisao(250);
    setFileHash("");
    setJaImportado(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!accountId) {
      toast.error("Escolha a conta antes de enviar o arquivo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const texto = String(reader.result ?? "");
      const nomeLower = file.name.toLowerCase();
      const isOfx =
        nomeLower.endsWith(".ofx") ||
        nomeLower.endsWith(".qfx") ||
        /OFXHEADER|<OFX>/i.test(texto.slice(0, 1000));

      setArquivo({ nome: file.name, texto });

      if (isOfx) {
        setFormato("ofx");
        rodarAnalise("ofx", texto);
      } else {
        setFormato("csv");
        const linhasBrutas = Papa.parse<string[]>(texto, {
          skipEmptyLines: true,
        }).data;
        const cabecalho = linhasBrutas[0] ?? [];
        setAmostra(linhasBrutas.slice(0, 6));

        const sugestao = sugerirColunas(cabecalho);
        if (sugestao.dataCol >= 0) setDataCol(String(sugestao.dataCol));
        if (sugestao.descCol >= 0) setDescCol(String(sugestao.descCol));
        if (sugestao.valorCol >= 0) setValorCol(String(sugestao.valorCol));
        setIdCol(sugestao.idCol >= 0 ? String(sugestao.idCol) : "-1");

        setEtapa("mapear");
      }
    };
    reader.onerror = () => toast.error("Não consegui ler esse arquivo.");
    reader.readAsText(file, "utf-8");
  }

  function rodarAnalise(tipo: ImportSource, texto: string) {
    startTransition(async () => {
      const r =
        tipo === "ofx"
          ? await analisarOfx(texto, accountId)
          : await analisarCsv(texto, accountId, {
              dataCol: Number(dataCol),
              descCol: Number(descCol),
              valorCol: Number(valorCol),
              idCol: Number(idCol) >= 0 ? Number(idCol) : undefined,
              inverterSinal,
              formatoData,
              temCabecalho,
            });

      if (!r.ok || !r.rows) {
        toast.error(r.error ?? "Não consegui ler o arquivo.");
        return;
      }

      setFileHash(r.fileHash ?? "");
      setJaImportado(!!r.jaImportadoAntes);
      setLinhasIgnoradas(r.linhasIgnoradas ?? 0);
      setLinhas(r.rows);
      setSelecionadas(
        new Set(
          r.rows.filter((l) => l.shouldImportByDefault).map((l) => l.key),
        ),
      );

      const cats: Record<string, string> = {};
      const descs: Record<string, string> = {};
      for (const l of r.rows) {
        if (l.suggestedCategoryId) cats[l.key] = l.suggestedCategoryId;
        // Só pré-preenche com o nome tratado quando ele é de fato diferente
        // do cru — evita "editar" toda linha sem necessidade quando a
        // heurística não achou nada pra limpar.
        if (l.suggestedDescription !== l.description) descs[l.key] = l.suggestedDescription;
      }
      setCategoriaPorLinha(cats);
      setDescricaoPorLinha(descs);
      setLembradas(new Set());
      setLimiteRevisao(250);
      setEtapa("revisao");
    });
  }

  function confirmarMapeamento() {
    if (!arquivo) return;
    if (dataCol === descCol || dataCol === valorCol || descCol === valorCol) {
      toast.error(
        "Escolha três colunas diferentes para data, descrição e valor.",
      );
      return;
    }
    if (
      idCol !== "-1" &&
      (idCol === dataCol || idCol === descCol || idCol === valorCol)
    ) {
      toast.error("A coluna de ID precisa ser diferente das outras três.");
      return;
    }
    rodarAnalise("csv", arquivo.texto);
  }

  function toggleLinha(key: string) {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selecionarTodas() {
    setSelecionadas(new Set(linhas.map((l) => l.key)));
  }

  function selecionarSoNovas() {
    setSelecionadas(
      new Set(linhas.filter((l) => l.shouldImportByDefault).map((l) => l.key)),
    );
  }

  function limparSelecao() {
    setSelecionadas(new Set());
  }

  function mudarCategoria(key: string, categoryId: string) {
    setCategoriaPorLinha((prev) => ({ ...prev, [key]: categoryId }));
    setLembradas((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function mudarDescricao(key: string, valor: string) {
    setDescricaoPorLinha((prev) => ({ ...prev, [key]: valor }));
  }

  function lembrarRegra(row: PreviewRow) {
    const categoryId = categoriaPorLinha[row.key];
    if (!categoryId) return;
    startTransition(async () => {
      const r = await criarRegraCategoria(row.description, categoryId);
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui salvar a regra.");
        return;
      }
      setLembradas((prev) => new Set(prev).add(row.key));
      toast.success("Vou categorizar assim da próxima vez.");
    });
  }

  function confirmar() {
    const escolhidas = linhas.filter((l) => selecionadas.has(l.key));
    if (escolhidas.length === 0) {
      toast.error("Selecione ao menos um lançamento.");
      return;
    }
    startTransition(async () => {
      const r = await confirmarImportacao(
        accountId,
        arquivo?.nome ?? "extrato",
        fileHash,
        formato,
        escolhidas.map((l) => ({
          date: l.date,
          amountCents: l.amountCents,
          description: (descricaoPorLinha[l.key] ?? l.description).trim() || l.description,
          externalId: l.externalId,
          type: l.type,
          categoryId: categoriaPorLinha[l.key] || null,
        })),
      );
      if (!r.ok) {
        toast.error(r.error ?? "Não consegui importar.");
        return;
      }
      toast.success(
        `${r.importadas} ${r.importadas === 1 ? "lançamento importado" : "lançamentos importados"}.`,
      );
      router.push("/transacoes");
      router.refresh();
    });
  }

  const categoriasPorTipo = (tipo: "receita" | "despesa") =>
    categorias.filter((c) => c.kind === tipo);

  const linhasVisiveis = linhas.slice(0, limiteRevisao);
  const internas = useMemo(
    () => linhas.filter((l) => l.reviewHint === "transferencia_interna").length,
    [linhas],
  );
  const possiveisReembolsos = useMemo(
    () => linhas.filter((l) => l.reviewHint === "possivel_reembolso_metade").length,
    [linhas],
  );
  const categorizadas = useMemo(
    () => linhas.filter((l) => categoriaPorLinha[l.key]).length,
    [linhas, categoriaPorLinha],
  );

  if (contas.length === 0) {
    return (
      <PageShell>
        <PageHeader titulo="Importar extrato" />
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">Cadastre uma conta primeiro</p>
            <p className="text-muted-foreground mt-1 text-sm">
              O extrato precisa entrar em alguma conta.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <a href="/contas">Ir para contas</a>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Botão de voltar é reset de estado (não navegação), por isso o
          cabeçalho não usa <PageHeader voltar>, que é sempre um Link. */}
      <div className="flex items-center gap-3">
        {etapa !== "upload" && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={limparTudo}
          >
            <ArrowLeft className="size-4" />
          </Button>
        )}
        <PageHeader
          className="flex-1"
          titulo="Importar extrato"
          descricao={
            (etapa === "upload" && "Suba o OFX ou CSV do banco.") ||
            (etapa === "mapear" && "Diga qual coluna é qual.") ||
            (etapa === "revisao" && "Confira antes de gravar.")
          }
        />
      </div>

      {etapa === "upload" && (
        <Card>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label>Conta de destino</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolher conta" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {TIPOS_CONTA[c.type].icon} {c.name} · {c.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label
              htmlFor="arquivo-extrato"
              className="border-muted-foreground/25 hover:bg-muted/50 flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors"
            >
              <FileUp className="text-muted-foreground size-8" />
              <div>
                <p className="font-medium">Clique para escolher o arquivo</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  .ofx, .qfx ou .csv — extrato ou fatura do cartão
                </p>
              </div>
              <input
                ref={inputRef}
                id="arquivo-extrato"
                type="file"
                accept=".ofx,.qfx,.csv,.txt"
                className="sr-only"
                onChange={onFile}
                disabled={pendente}
              />
            </label>

            <p className="text-muted-foreground text-xs">
              O arquivo é processado e descartado — só os lançamentos ficam
              guardados. OFX é o formato mais confiável: traz um ID único por
              lançamento, então reimportar o mesmo período nunca duplica.
            </p>
          </CardContent>
        </Card>
      )}

      {etapa === "mapear" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Colunas do arquivo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                <div>
                  <Label htmlFor="tem-cabecalho">
                    A primeira linha é cabeçalho
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Desligue se o arquivo começa direto com os lançamentos.
                  </p>
                </div>
                <Checkbox
                  id="tem-cabecalho"
                  checked={temCabecalho}
                  onCheckedChange={(v) => setTemCabecalho(v === true)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Coluna da data</Label>
                  <Select value={dataCol} onValueChange={setDataCol}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {amostra[0]?.map((_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Coluna {i + 1}
                          {temCabecalho && amostra[0][i]
                            ? ` (${amostra[0][i]})`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Coluna da descrição</Label>
                  <Select value={descCol} onValueChange={setDescCol}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {amostra[0]?.map((_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Coluna {i + 1}
                          {temCabecalho && amostra[0][i]
                            ? ` (${amostra[0][i]})`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Coluna do valor</Label>
                  <Select value={valorCol} onValueChange={setValorCol}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {amostra[0]?.map((_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Coluna {i + 1}
                          {temCabecalho && amostra[0][i]
                            ? ` (${amostra[0][i]})`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Coluna de ID (opcional)</Label>
                  <Select value={idCol} onValueChange={setIdCol}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">Não tem</SelectItem>
                      {amostra[0]?.map((_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Coluna {i + 1}
                          {temCabecalho && amostra[0][i]
                            ? ` (${amostra[0][i]})`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Se o extrato traz um identificador único por lançamento (o
                    Nubank traz), usar essa coluna deixa a detecção de duplicata
                    exata em vez de aproximada.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Formato da data</Label>
                  <Select
                    value={formatoData}
                    onValueChange={(v) => setFormatoData(v as FormatoData)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATOS_DATA.map((f) => (
                        <SelectItem key={f.valor} value={f.valor}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <div>
                    <Label htmlFor="inverter-sinal">
                      Inverter sinal do valor
                    </Label>
                    <p className="text-muted-foreground text-xs">
                      Ligue se despesa aparece positiva no arquivo.
                    </p>
                  </div>
                  <Checkbox
                    id="inverter-sinal"
                    checked={inverterSinal}
                    onCheckedChange={(v) => setInverterSinal(v === true)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {amostra.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Prévia do arquivo</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {amostra.slice(temCabecalho ? 1 : 0).map((linha, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {linha.map((celula, j) => {
                          const destaque =
                            String(j) === dataCol
                              ? "bg-blue-500/10"
                              : String(j) === descCol
                                ? "bg-amber-500/10"
                                : String(j) === valorCol
                                  ? "bg-emerald-500/10"
                                  : "";
                          return (
                            <td
                              key={j}
                              className={`px-2 py-1.5 whitespace-nowrap ${destaque}`}
                            >
                              {celula || "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={confirmarMapeamento}
            disabled={pendente}
            className="w-full"
          >
            {pendente ? "Lendo…" : "Continuar"}
          </Button>
        </div>
      )}

      {etapa === "revisao" && (
        <div className="space-y-4">
          {jaImportado && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p>
                Esse arquivo exato já foi importado antes. Os lançamentos
                repetidos já vêm desmarcados abaixo.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">
              {linhas.length} lançamentos no arquivo
            </Badge>
            <Badge variant="outline">{selecionadas.size} selecionados</Badge>
            {linhas.some((l) => l.isDuplicate) && (
              <Badge variant="outline" className="text-amber-600">
                {linhas.filter((l) => l.isDuplicate).length} duplicados
              </Badge>
            )}
            {internas > 0 && (
              <Badge variant="outline" className="text-sky-700">
                {internas} transferências internas desmarcadas
              </Badge>
            )}
            {possiveisReembolsos > 0 && (
              <Badge variant="outline" className="text-violet-700">
                {possiveisReembolsos} podem ser metade de uma compra já lançada
              </Badge>
            )}
            {categorizadas > 0 && (
              <Badge variant="outline">
                {categorizadas} com categoria sugerida
              </Badge>
            )}
            {linhasIgnoradas > 0 && (
              <Badge variant="outline" className="text-muted-foreground">
                {linhasIgnoradas} linhas ignoradas (sem data ou valor)
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={selecionarSoNovas}>
              <Sparkles className="size-3.5" />
              Só as novas
            </Button>
            <Button size="sm" variant="outline" onClick={selecionarTodas}>
              <CheckCheck className="size-3.5" />
              Selecionar todas
            </Button>
            <Button size="sm" variant="outline" onClick={limparSelecao}>
              Desmarcar todas
            </Button>
          </div>

          <ListCard className="max-h-[28rem] overflow-y-auto">
            {linhasVisiveis.map((row) => {
              const selecionada = selecionadas.has(row.key);
              const categoriaAtual = categoriaPorLinha[row.key] ?? "";
              const mudouCategoria =
                categoriaAtual &&
                categoriaAtual !== (row.suggestedCategoryId ?? "");
              const descricaoAtual = descricaoPorLinha[row.key] ?? row.description;
              const nomeFoiTratado = row.suggestedDescription !== row.description;

              return (
                <div
                  key={row.key}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    row.isDuplicate ? "opacity-60" : ""
                  }`}
                >
                  <Checkbox
                    className="mt-1"
                    checked={selecionada}
                    onCheckedChange={() => toggleLinha(row.key)}
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        className="h-7 max-w-72 text-sm font-medium"
                        value={descricaoAtual}
                        onChange={(e) => mudarDescricao(row.key, e.target.value)}
                      />
                      {row.isDuplicate && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-amber-600"
                        >
                          duplicado
                        </Badge>
                      )}
                      {row.reviewHint === "transferencia_interna" && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-sky-700"
                        >
                          transferência interna
                        </Badge>
                      )}
                      {row.reviewHint === "possivel_reembolso_metade" && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-violet-700"
                        >
                          pode ser metade de outra compra
                        </Badge>
                      )}
                    </div>
                    {nomeFoiTratado && (
                      <p className="text-muted-foreground truncate text-[11px]">
                        Original: {row.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {dataBR(row.date)}
                      </span>
                      <span
                        className={
                          row.type === "receita"
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }
                      >
                        {row.type === "receita" ? "+" : "−"}
                        {formatMoney(row.amountCents, moedaConta)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Select
                        value={categoriaAtual}
                        onValueChange={(v) => mudarCategoria(row.key, v)}
                      >
                        <SelectTrigger className="h-8 w-full max-w-56 text-xs">
                          <SelectValue placeholder="Sem categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriasPorTipo(row.type).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.icon} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {mudouCategoria &&
                        (lembradas.has(row.key) ? (
                          <span className="text-muted-foreground flex items-center gap-1 text-xs">
                            <Check className="size-3.5" /> lembrado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => lembrarRegra(row)}
                            className="text-primary shrink-0 text-xs whitespace-nowrap underline-offset-2 hover:underline"
                          >
                            lembrar essa
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
            {linhas.length > linhasVisiveis.length && (
              <div className="px-4 py-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setLimiteRevisao((atual) => atual + 250)}
                >
                  Mostrar mais{" "}
                  {Math.min(250, linhas.length - linhasVisiveis.length)}{" "}
                  lançamentos
                </Button>
              </div>
            )}
          </ListCard>

          <Button
            onClick={confirmar}
            disabled={pendente}
            className="w-full"
            size="lg"
          >
            <Upload className="size-4" />
            {pendente
              ? "Importando…"
              : `Importar ${selecionadas.size} ${selecionadas.size === 1 ? "lançamento" : "lançamentos"}`}
          </Button>
        </div>
      )}
    </PageShell>
  );
}
