import { requireSession } from "@/lib/auth";
import { AppBottomNav, AppSidebar } from "@/components/app/app-nav";
import { BuscaGlobal } from "@/components/app/busca-global";
import { UserMenu } from "@/components/app/user-menu";
import { Heart, WalletCards } from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background/90 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/70 px-4 backdrop-blur-xl md:h-[4.5rem] md:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm">
            <WalletCards className="size-[1.125rem]" />
          </span>
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-tight">
              {session.couple.name}
            </span>
            <span className="text-muted-foreground hidden items-center gap-1 text-[11px] sm:flex">
              <Heart className="size-2.5 fill-current" /> finanças a dois
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <BuscaGlobal moeda={session.couple.primary_currency} />
          <UserMenu
            nome={session.profile.display_name}
            emoji={session.profile.avatar_emoji}
            casal={
              session.partner
                ? `com ${session.partner.profile.display_name}`
                : "sozinho por enquanto"
            }
          />
        </div>
      </header>

      <div className="flex flex-1">
        <AppSidebar />
        <main className="min-w-0 flex-1 px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-8">
          {children}
        </main>
      </div>

      <AppBottomNav />
    </div>
  );
}
