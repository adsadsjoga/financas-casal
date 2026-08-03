import {
  ArrowLeftRight,
  Banknote,
  CarFront,
  CalendarClock,
  ClipboardCheck,
  Handshake,
  Home,
  PiggyBank,
  Settings,
  Target,
  Upload,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Aparece na barra inferior do celular. */
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início", icon: Home, primary: true },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight, primary: true },
  { href: "/importar", label: "Importar", icon: Upload, primary: true },
  { href: "/contas", label: "Contas", icon: Banknote, primary: true },
  { href: "/carros", label: "Carros", icon: CarFront },
  { href: "/revisar", label: "Revisar", icon: ClipboardCheck },
  { href: "/fixas", label: "Contas fixas", icon: CalendarClock },
  { href: "/orcamentos", label: "Orçamentos", icon: PiggyBank },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/acerto", label: "Acerto de contas", icon: Handshake },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
