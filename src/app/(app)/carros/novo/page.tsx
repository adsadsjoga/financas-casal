import { PageShell } from "@/components/app/page-shell";
import { PageHeader } from "@/components/app/page-header";
import { NovoCarroForm } from "../novo-carro-form";
export const metadata = { title: "Novo carro · Finanças do Casal" };
export default function NovoCarroPage() {
  return (
    <PageShell>
      <PageHeader
        voltar={{ href: "/carros", rotulo: "Voltar para carros" }}
        titulo="Cadastrar carro"
        descricao="Registre a compra agora e conecte os pagamentos do Revolut depois."
      />
      <NovoCarroForm />
    </PageShell>
  );
}
