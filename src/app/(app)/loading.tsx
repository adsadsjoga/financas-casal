import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/app/page-shell";

/**
 * Esqueleto neutro — vale para QUALQUER rota do grupo (app), não só a home.
 * Antes era uma silhueta de dashboard (grade de 4 + gráfico de barras) numa
 * largura (`max-w-6xl`) que nenhuma página real usa, e aparecia igual ao
 * abrir Configurações, Acerto, Contas etc. — desconexo do que vinha a seguir.
 */
export default function AppLoading() {
  return (
    <PageShell>
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-2 py-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </PageShell>
  );
}
