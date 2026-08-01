import { Upload } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { EmConstrucao } from "@/components/app/em-construcao";

export const metadata = { title: "Importar · Finanças do Casal" };

export default async function ImportarPage() {
  await requireSession();
  return (
    <EmConstrucao
      icone={Upload}
      titulo="Importar extrato"
      descricao="Suba o OFX ou CSV do banco e o app lança tudo classificado, sem duplicar o que já foi importado antes. Chega em breve — por ora, lance na mão em Transações."
    />
  );
}
