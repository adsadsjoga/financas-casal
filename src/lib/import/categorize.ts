import { normalizeDescription } from "./normalize";

export type ImportCategory = {
  id: string;
  name: string;
  kind: "receita" | "despesa";
};

const REGRAS_DESPESA: Array<{ categoria: string; padrao: RegExp }> = [
  { categoria: "Moradia", padrao: /\b(rent|aluguel|landlord|mortgage|housing)\b/ },
  {
    categoria: "Contas de casa",
    padrao: /\b(vodafone|eir|virgin media|three|electric|energia|esb|gas bill|utility|internet|phone|waste|bin)\b/,
  },
  {
    categoria: "Mercado",
    padrao: /\b(tesco|lidl|aldi|dunnes|supervalu|centra|spar|mace|iceland|polonez|butcher|grocery|market)\b/,
  },
  {
    categoria: "Alimentacao fora",
    padrao: /\b(restaurant|cafe|coffee|mcdonald|burger|kfc|deliveroo|just eat|uber eats|starbucks|subway|pizza|nando|domino|takeaway|bakery)\b/,
  },
  {
    categoria: "Transporte",
    padrao: /\b(luas|dublin bus|irish rail|bolt|uber|free now|taxi|leap|parking|transport|trainline)\b/,
  },
  { categoria: "Combustivel", padrao: /\b(circle k|applegreen|maxol|fuel|petrol|diesel|shell)\b/ },
  { categoria: "Seguros", padrao: /\b(insurance|allianz|aviva|axa|liberty|123 ie)\b/ },
  { categoria: "Saude", padrao: /\b(pharmacy|chemist|boots|hospital|doctor|dental|clinic|health|vhi|laya)\b/ },
  { categoria: "Educacao", padrao: /\b(udemy|coursera|book|education|school|university|openai|chatgpt)\b/ },
  {
    categoria: "Assinaturas",
    padrao: /\b(netflix|spotify|prime video|disney|youtube|apple com bill|google storage|icloud|patreon|subscription|playstation|xbox|steam)\b/,
  },
  { categoria: "Lazer", padrao: /\b(cinema|ticket|event|concert|bowling|leisure|game|museum)\b/ },
  { categoria: "Viagem", padrao: /\b(booking com|hotel|hostel|airbnb|ryanair|aer lingus|wizz|flight|travel)\b/ },
  {
    categoria: "Compras",
    padrao: /\b(amazon|temu|shein|zara|penneys|primark|ikea|decathlon|tk maxx|argos|currys|harvey norman|aliexpress|vinted)\b/,
  },
  { categoria: "Tarifas bancarias", padrao: /\b(fee|charge|revolut fee|atm fee|exchange fee)\b/ },
];

const REGRAS_RECEITA: Array<{ categoria: string; padrao: RegExp }> = [
  { categoria: "Salario", padrao: /\b(salary|wages|payroll)\b/ },
  { categoria: "Pagamento de cliente", padrao: /\b(payment from|client|invoice|revolut pro)\b/ },
  { categoria: "Rendimentos", padrao: /\b(interest|net interest|dividend|yield)\b/ },
  { categoria: "Reembolso", padrao: /\b(refund|reimbursement|cashback|reversal)\b/ },
];

const TRANSFERENCIA_INTERNA = [
  /\b(to|from) eur\b/,
  /\bsavings vault\b/,
  /\bvault topup\b/,
  /\bround up\b/,
  /\bto investment account\b/,
  /\bfrom investment account\b/,
  /\bexchanged (to|from)\b/,
  /\bapple pay top up\b/,
  /\btop up\b/,
  /\bto gabriel garcia\b/,
  /\bfrom gabriel garcia\b/,
  /\btransfer (to|from) joana\b/,
];

function mapaPorNome(categorias: ImportCategory[]) {
  return new Map(categorias.map((c) => [normalizeDescription(c.name), c]));
}

export function isLikelyInternalTransfer(description: string): boolean {
  const desc = normalizeDescription(description);
  return TRANSFERENCIA_INTERNA.some((padrao) => padrao.test(desc));
}

export function suggestCategoryId(
  description: string,
  type: "receita" | "despesa",
  categorias: ImportCategory[],
): string | null {
  const desc = normalizeDescription(description);
  const porNome = mapaPorNome(categorias.filter((c) => c.kind === type));
  const regras = type === "receita" ? REGRAS_RECEITA : REGRAS_DESPESA;

  for (const regra of regras) {
    if (!regra.padrao.test(desc)) continue;
    const categoria = porNome.get(normalizeDescription(regra.categoria));
    if (categoria) return categoria.id;
  }

  if (isLikelyInternalTransfer(description)) {
    const fallback = porNome.get(type === "receita" ? "outras receitas" : "outras despesas");
    return fallback?.id ?? null;
  }

  return null;
}
