import { requireSession } from "@/lib/auth";

import { ConfiguracoesClient } from "./configuracoes-client";

export const metadata = { title: "Configurações · Finanças do Casal" };

export default async function ConfiguracoesPage() {
  const session = await requireSession();

  return (
    <ConfiguracoesClient
      casal={session.couple}
      me={session.me}
      parceiro={session.partner}
    />
  );
}
