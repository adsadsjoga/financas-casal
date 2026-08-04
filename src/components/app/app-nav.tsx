"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NAV_GROUP_ORDER, isActive } from "@/lib/nav";
import { AppNavLink } from "./nav-link";

/** Barra lateral do desktop. */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <nav className="bg-sidebar text-sidebar-foreground hidden w-60 shrink-0 flex-col gap-1.5 border-r border-sidebar-border p-4 md:flex">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <AppNavLink
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-all",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-[1.125rem]" />
            {item.label}
          </AppNavLink>
        );
      })}
    </nav>
  );
}

/** Barra inferior do celular: 4 atalhos + "Mais". */
export function AppBottomNav() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const primarios = NAV_ITEMS.filter((i) => i.primary);
  const resto = NAV_ITEMS.filter((i) => !i.primary);

  return (
    <nav className="bg-card/95 supports-[backdrop-filter]:bg-card/85 fixed inset-x-0 bottom-0 z-40 grid h-[calc(4.5rem+env(safe-area-inset-bottom))] grid-cols-5 border-t border-border/70 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_oklch(0.2_0.03_165/0.08)] backdrop-blur-xl md:hidden">
      {primarios.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <AppNavLink
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex min-w-0 flex-col items-center justify-center gap-1 pt-1 text-[10px] transition-colors",
              active ? "text-primary font-bold" : "text-muted-foreground",
            )}
          >
            {active && <span className="bg-primary absolute top-0 h-0.5 w-7 rounded-full" />}
            <Icon className="size-[1.3rem]" strokeWidth={active ? 2.4 : 1.9} />
            <span className="max-w-full truncate px-0.5">{item.label}</span>
          </AppNavLink>
        );
      })}

      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground flex min-w-0 flex-col items-center justify-center gap-1 pt-1 text-[10px]"
          >
            <Menu className="size-[1.3rem]" />
            Mais
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle>Mais</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 p-4 pt-0">
            {NAV_GROUP_ORDER.map((grupo) => {
              const itensDoGrupo = resto.filter((item) => item.group === grupo);
              if (itensDoGrupo.length === 0) return null;
              return (
                <div key={grupo} className="grid gap-1">
                  <p className="text-muted-foreground px-3 text-[11px] font-semibold tracking-wide uppercase">
                    {grupo}
                  </p>
                  {itensDoGrupo.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.href}
                        asChild
                        variant="ghost"
                        className="justify-start"
                        onClick={() => setAberto(false)}
                      >
                        <AppNavLink href={item.href}>
                          <Icon className="size-4" />
                          {item.label}
                        </AppNavLink>
                      </Button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
