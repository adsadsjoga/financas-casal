import { Target } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { EmConstrucao } from "@/components/app/em-construcao";

export const metadata = { title: "Metas · Finanças do Casal" };

export default async function MetasPage() {
  await requireSession();
  return (
    <EmConstrucao
      icone={Target}
      titulo="Metas"
      descricao="Aqui vão as metas do casal — viagem, entrada de casa, reserva — com o quanto cada um já aportou. Chega em breve."
    />
  );
}
