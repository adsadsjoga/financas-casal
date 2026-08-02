import { Suspense } from "react";
import { Heart, ShieldCheck, WalletCards } from "lucide-react";

import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · Finanças do Casal" };

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-8 sm:p-8">
      <div className="bg-primary absolute inset-x-0 top-0 h-44 sm:h-1/3" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 text-center text-primary-foreground sm:mb-8">
          <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-white/14 ring-1 ring-white/20">
            <WalletCards className="size-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Finanças do Casal</h1>
          <p className="mt-1 text-sm text-primary-foreground/75">
            O dinheiro de vocês, em sintonia.
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <div className="text-muted-foreground mt-5 flex items-center justify-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> Dados protegidos</span>
          <span className="flex items-center gap-1.5"><Heart className="size-3.5" /> Feito para dois</span>
        </div>
      </div>
    </main>
  );
}
