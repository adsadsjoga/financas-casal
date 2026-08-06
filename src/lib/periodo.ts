import {
  addMeses,
  diaSeguinte,
  hojeISO,
  inicioDoAnoSeguinte,
  inicioDoMesSeguinte,
  nomeDoMes,
  primeiroDiaDoAno,
  primeiroDiaDoMes,
} from "@/lib/dates";

export type ModoPeriodo = "mes" | "ano" | "dia" | "intervalo";

export interface Periodo {
  modo: ModoPeriodo;
  /** Início, inclusive. */
  de: string;
  /** Fim, exclusivo — pronto para `.lt("occurred_on", ateExclusivo)`. */
  ateExclusivo: string;
  /** Valor do parâmetro que identifica o período nesse modo (mês, ano, dia ou início do intervalo). */
  referencia: string;
  /** Só preenchido no modo intervalo — fim que o usuário digitou, inclusive. */
  ateIntervalo?: string;
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const ANO = /^\d{4}$/;

/**
 * Resolve o período pedido em Transações a partir da querystring — mês
 * inteiro (padrão, comportamento antigo), ano inteiro, um dia só, ou um
 * intervalo livre `de`/`ate`. Sempre cai num período válido mesmo com
 * parâmetro ausente ou malformado, nunca deixa a página quebrar.
 */
export function resolverPeriodo(params: {
  modo?: string;
  mes?: string;
  ano?: string;
  dia?: string;
  de?: string;
  ate?: string;
}): Periodo {
  const modo: ModoPeriodo =
    params.modo === "ano" || params.modo === "dia" || params.modo === "intervalo"
      ? params.modo
      : "mes";

  if (modo === "ano") {
    const ano = ANO.test(params.ano ?? "") ? params.ano! : hojeISO().slice(0, 4);
    const de = primeiroDiaDoAno(`${ano}-01-01`);
    return { modo, de, ateExclusivo: inicioDoAnoSeguinte(de), referencia: ano };
  }

  if (modo === "dia") {
    const dia = DATA_ISO.test(params.dia ?? "") ? params.dia! : hojeISO();
    return { modo, de: dia, ateExclusivo: diaSeguinte(dia), referencia: dia };
  }

  if (modo === "intervalo") {
    const de = DATA_ISO.test(params.de ?? "") ? params.de! : primeiroDiaDoMes(hojeISO());
    const ateBruto = DATA_ISO.test(params.ate ?? "") ? params.ate! : hojeISO();
    const ate = ateBruto >= de ? ateBruto : de;
    return { modo, de, ateExclusivo: diaSeguinte(ate), referencia: de, ateIntervalo: ate };
  }

  const mes = DATA_ISO.test(params.mes ?? "") ? primeiroDiaDoMes(params.mes!) : primeiroDiaDoMes(hojeISO());
  return { modo, de: mes, ateExclusivo: inicioDoMesSeguinte(mes), referencia: mes };
}

export type OpcaoComparativa =
  | "mes-atual"
  | "mes-anterior"
  | "semestre-atual"
  | "semestre-anterior"
  | "ano-atual"
  | "ano-anterior";

export const OPCOES_COMPARATIVAS: { valor: OpcaoComparativa; label: string }[] = [
  { valor: "mes-atual", label: "Este mês" },
  { valor: "mes-anterior", label: "Mês passado" },
  { valor: "semestre-atual", label: "Este semestre" },
  { valor: "semestre-anterior", label: "Semestre passado" },
  { valor: "ano-atual", label: "Este ano" },
  { valor: "ano-anterior", label: "Ano passado" },
];

/** Intervalo (com fim exclusivo) de uma das opções pré-definidas do relatório comparativo. */
export function resolverPeriodoComparativo(
  opcao: OpcaoComparativa,
  hoje: string,
): { de: string; ateExclusivo: string; label: string } {
  const mesAtual = primeiroDiaDoMes(hoje);

  if (opcao === "mes-atual" || opcao === "mes-anterior") {
    const mes = opcao === "mes-atual" ? mesAtual : addMeses(mesAtual, -1);
    return { de: mes, ateExclusivo: inicioDoMesSeguinte(mes), label: nomeDoMes(mes) };
  }

  if (opcao === "semestre-atual" || opcao === "semestre-anterior") {
    const ano = mesAtual.slice(0, 4);
    const mesNum = Number(mesAtual.slice(5, 7));
    const inicioSemestreAtual = `${ano}-${mesNum <= 6 ? "01" : "07"}-01`;
    const inicio =
      opcao === "semestre-atual" ? inicioSemestreAtual : addMeses(inicioSemestreAtual, -6);
    const fim = addMeses(inicio, 6);
    return { de: inicio, ateExclusivo: fim, label: `${nomeDoMes(inicio)} – ${nomeDoMes(addMeses(fim, -1))}` };
  }

  const anoAtual = Number(mesAtual.slice(0, 4));
  const ano = opcao === "ano-atual" ? anoAtual : anoAtual - 1;
  return { de: `${ano}-01-01`, ateExclusivo: `${ano + 1}-01-01`, label: String(ano) };
}
