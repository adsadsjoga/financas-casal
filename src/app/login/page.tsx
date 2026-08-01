import { Suspense } from "react";

import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · Finanças do Casal" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-4xl">💰</div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Finanças do Casal
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            As contas de vocês dois no mesmo lugar.
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
