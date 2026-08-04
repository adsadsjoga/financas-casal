"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addMeses, hojeISO } from "@/lib/dates";
import type { Account } from "@/lib/database.types";

import { exportarTransacoesCsv } from "./actions";

type Periodo = "1m" | "6m" | "12m" | "tudo" | "custom";

const PERIODOS: Array<{ valor: Periodo; label: string }> = [
  { valor: "1m", label: "1 mês" },
  { valor: "6m", label: "6 meses" },
  { valor: "12m", label: "1 ano" },
  { valor: "tudo", label: "Desde o início" },
  { valor: "custom", label: "Escolher período" },
];

/** Dispara o download de um texto como arquivo, sem precisar de servidor de arquivos. */
function baixarArquivo(conteudo: string, nomeArquivo: string) {
  const blob = new Blob([conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportarTransacoesDialog({ contas }: { contas: Account[] }) {
  const [aberto, setAberto] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [contasSelecionadas, setContasSelecionadas] = useState<Set<string>>(
    new Set(),
  );
  const [periodo, setPeriodo] = useState<Periodo>("tudo");
  const [customDe, setCustomDe] = useState("");
  const [customAte, setCustomAte] = useState("");

  const todasSelecionadas = contasSelecionadas.size === 0;

  function alternarConta(id: string) {
    setContasSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function calcularPeriodo(): { desde: string | null; ate: string | null } {
    const hoje = hojeISO();
    if (periodo === "tudo") return { desde: null, ate: hoje };
    if (periodo === "custom") {
      return { desde: customDe || null, ate: customAte || null };
    }
    const meses = { "1m": 1, "6m": 6, "12m": 12 }[periodo];
    return { desde: addMeses(hoje, -meses), ate: hoje };
  }

  async function baixar() {
    setBaixando(true);
    const { desde, ate } = calcularPeriodo();
    const r = await exportarTransacoesCsv({
      accountIds: [...contasSelecionadas],
      desde,
      ate,
    });
    setBaixando(false);

    if (!r.ok) {
      toast.error(r.error ?? "Não consegui gerar a planilha.");
      return;
    }
    if (r.total === 0) {
      toast.error("Nenhum lançamento nesse período/conta.");
      return;
    }
    baixarArquivo(r.csv, r.nomeArquivo);
    toast.success(`${r.total} lançamentos baixados.`);
    setAberto(false);
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="size-4" />
          Planilha
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Baixar planilha de lançamentos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Contas</Label>
            <div className="space-y-1.5 rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={todasSelecionadas}
                  onCheckedChange={() => setContasSelecionadas(new Set())}
                />
                Todas as contas
              </label>
              <div className="border-t pt-1.5">
                {contas.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 py-1 text-sm"
                  >
                    <Checkbox
                      checked={contasSelecionadas.has(c.id)}
                      onCheckedChange={() => alternarConta(c.id)}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Período</Label>
            <div className="flex flex-wrap gap-1.5">
              {PERIODOS.map((p) => (
                <Button
                  key={p.valor}
                  type="button"
                  size="sm"
                  variant={periodo === p.valor ? "default" : "outline"}
                  onClick={() => setPeriodo(p.valor)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            {periodo === "custom" && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="export-de" className="text-xs">
                    De (opcional)
                  </Label>
                  <Input
                    id="export-de"
                    type="date"
                    value={customDe}
                    onChange={(e) => setCustomDe(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="export-ate" className="text-xs">
                    Até (opcional)
                  </Label>
                  <Input
                    id="export-ate"
                    type="date"
                    value={customAte}
                    onChange={(e) => setCustomAte(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={baixar} disabled={baixando}>
            <Download className="size-4" />
            {baixando ? "Gerando…" : "Baixar CSV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
