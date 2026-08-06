import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NovoCarroForm } from "../novo-carro-form";
export const metadata = { title: "Novo carro · Finanças do Casal" };
export default async function NovoCarroPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const [contrapartesRes, categoriasRes, contasRes] = await Promise.all([
    supabase
      .from("counterparties")
      .select("id, name")
      .eq("couple_id", session.couple.id)
      .eq("archived", false)
      .order("name"),
    supabase
      .from("categories")
      .select("id, name, icon")
      .eq("couple_id", session.couple.id),
    supabase
      .from("accounts")
      .select("id, name")
      .eq("couple_id", session.couple.id),
  ]);
  return (
    <PageShell>
      <PageHeader
        voltar={{ href: "/carros", rotulo: "Voltar para carros" }}
        titulo="Cadastrar carro"
        descricao="Registre a compra agora e conecte os pagamentos do Revolut depois."
      />
      <NovoCarroForm
        contrapartes={contrapartesRes.data ?? []}
        categorias={categoriasRes.data ?? []}
        contas={contasRes.data ?? []}
        moeda={session.couple.primary_currency}
      />
    </PageShell>
  );
}
