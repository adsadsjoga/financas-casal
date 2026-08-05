import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NovoCarroForm } from "../novo-carro-form";
export const metadata = { title: "Novo carro · Finanças do Casal" };
export default async function NovoCarroPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("counterparties")
    .select("id, name")
    .eq("couple_id", session.couple.id)
    .eq("archived", false)
    .order("name");
  return (
    <PageShell>
      <PageHeader
        voltar={{ href: "/carros", rotulo: "Voltar para carros" }}
        titulo="Cadastrar carro"
        descricao="Registre a compra agora e conecte os pagamentos do Revolut depois."
      />
      <NovoCarroForm contrapartes={data ?? []} />
    </PageShell>
  );
}
