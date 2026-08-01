import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function EmConstrucao({
  icone: Icone,
  titulo,
  descricao,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Icone className="text-muted-foreground size-8" />
          <p className="font-medium">Ainda não deu tempo de construir isso</p>
          <p className="text-muted-foreground max-w-sm text-sm">{descricao}</p>
        </CardContent>
      </Card>
    </div>
  );
}
