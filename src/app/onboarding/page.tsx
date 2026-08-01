import { redirect } from "next/navigation";

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
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-4xl">💑</div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Vamos começar
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Crie o espaço de vocês ou entre no que sua esposa já criou.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </main>
  );
}
