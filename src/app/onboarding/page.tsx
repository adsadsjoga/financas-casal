import { redirect } from "next/navigation";
import { HeartHandshake, WalletCards } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Começar · Finanças do Casal" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (membership) redirect("/");

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-8 sm:p-8">
      <div className="bg-primary absolute inset-x-0 top-0 h-44 sm:h-1/3" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center text-primary-foreground sm:mb-8">
          <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-white/14 ring-1 ring-white/20">
            <HeartHandshake className="size-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Vamos começar
          </h1>
          <p className="mt-1 text-sm text-primary-foreground/75">
            Crie o espaço de vocês ou entre no que sua esposa já criou.
          </p>
        </div>
        <OnboardingForm />
        <div className="text-muted-foreground mt-5 flex items-center justify-center gap-1.5 text-[11px]">
          <WalletCards className="size-3.5" /> Um único lugar para decidir juntos
        </div>
      </div>
    </main>
  );
}
