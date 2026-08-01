import { requireSession } from "@/lib/auth";
import { AppBottomNav, AppSidebar } from "@/components/app/app-nav";
import { UserMenu } from "@/components/app/user-menu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">💰</span>
          <span className="text-sm font-semibold tracking-tight">
            {session.couple.name}
          </span>
        </div>
        <UserMenu
          nome={session.profile.display_name}
          emoji={session.profile.avatar_emoji}
          casal={
            session.partner
              ? `com ${session.partner.profile.display_name}`
              : "sozinho por enquanto"
          }
        />
      </header>

      <div className="flex flex-1">
        <AppSidebar />
        <main className="min-w-0 flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>

      <AppBottomNav />
    </div>
  );
}
