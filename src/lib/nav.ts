import {
  ArrowLeftRight,
  Banknote,
  CarFront,
  CalendarClock,
  ClipboardCheck,
  FolderKanban,
  HandCoins,
  Handshake,
  Home,
  PiggyBank,
  Settings,
  Tag,
  Target,
  TrendingUp,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Aparece na barra inferior do celular. */
  primary?: boolean;
  /** Setor no menu "Mais", para os itens não-primários. */
  group?: "Movimentação" | "Planejamento" | "Casal" | "Patrimônio" | "Conta";
}

// Os 4 primários + "Mais" são os únicos 5 slots da barra inferior — mobile é
// prioridade #1 do produto (ver AGENTS.md). Orçamentos entrou no lugar de
// Importar: importar extrato é ação esporádica, orçamento é conferido com
// frequência. Importar continua acessível em "Mais" > Movimentação.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início", icon: Home, primary: true },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight, primary: true },
  { href: "/contas", label: "Contas", icon: Banknote, primary: true },
  { href: "/orcamentos", label: "Orçamentos", icon: PiggyBank, primary: true },
  { href: "/importar", label: "Importar extrato", icon: Upload, group: "Movimentação" },
  { href: "/revisar", label: "Revisar categorias", icon: ClipboardCheck, group: "Movimentação" },
  { href: "/metas", label: "Metas", icon: Target, group: "Planejamento" },
  { href: "/fixas", label: "Contas fixas", icon: CalendarClock, group: "Planejamento" },
  { href: "/categorias", label: "Categorias", icon: Tag, group: "Planejamento" },
  { href: "/pessoas", label: "Pessoas", icon: Users, group: "Casal" },
  { href: "/acerto", label: "Acerto de contas", icon: Handshake, group: "Casal" },
  { href: "/investimentos", label: "Investimentos", icon: TrendingUp, group: "Patrimônio" },
  { href: "/carros", label: "Carros", icon: CarFront, group: "Patrimônio" },
  { href: "/emprestimos", label: "Empréstimos", icon: HandCoins, group: "Patrimônio" },
  { href: "/projetos", label: "Projetos", icon: FolderKanban, group: "Patrimônio" },
  { href: "/configuracoes", label: "Configurações", icon: Settings, group: "Conta" },
];

/** Ordem de exibição dos setores no menu "Mais". */
export const NAV_GROUP_ORDER: NonNullable<NavItem["group"]>[] = [
  "Movimentação",
  "Planejamento",
  "Casal",
  "Patrimônio",
  "Conta",
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
