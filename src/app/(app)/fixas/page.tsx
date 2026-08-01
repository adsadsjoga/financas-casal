import { CalendarClock } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { EmConstrucao } from "@/components/app/em-construcao";

export const metadata = { title: "Contas fixas · Finanças do Casal" };

export default async function FixasPage() {
  await requireSession();
  return (
    <EmConstrucao
      icone={CalendarClock}
      titulo="Contas fixas"
      descricao="Aluguel, luz, streaming — cadastradas uma vez, com previsão de quanto sobra até o fim do mês. Chega em breve."
    />
  );
}
