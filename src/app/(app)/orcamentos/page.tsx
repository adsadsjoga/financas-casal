import { PiggyBank } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { EmConstrucao } from "@/components/app/em-construcao";

export const metadata = { title: "Orçamentos · Finanças do Casal" };

export default async function OrcamentosPage() {
  await requireSession();
  return (
    <EmConstrucao
      icone={PiggyBank}
      titulo="Orçamentos"
      descricao="Limite por categoria e por mês, com alerta ao estourar. Chega em breve."
    />
  );
}
