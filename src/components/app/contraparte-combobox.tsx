"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { normalizeDescription } from "@/lib/normalize-text";

/**
 * Campo de texto que sugere contrapartes já cadastradas conforme digita,
 * mas aceita nome livre (sem cadastro) também — usado hoje pra escolher o
 * comprador de um carro. Ao escolher uma sugestão, o texto vira o nome dela
 * e o id da contraparte fica disponível pra vincular a conta/histórico
 * completo depois (`buyer_counterparty_id`); digitando algo que não bate com
 * nenhuma, só fica o texto, sem vínculo.
 */
export function ContraparteCombobox({
  contrapartes,
  texto,
  onTextoChange,
  onSelecionar,
  placeholder,
}: {
  contrapartes: Array<{ id: string; name: string }>;
  texto: string;
  onTextoChange: (texto: string) => void;
  onSelecionar: (id: string | null) => void;
  placeholder?: string;
}) {
  const [aberto, setAberto] = useState(false);

  const sugestoes = useMemo(() => {
    const termo = normalizeDescription(texto);
    if (!termo) return [];
    return contrapartes
      .filter((c) => normalizeDescription(c.name).includes(termo))
      .slice(0, 8);
  }, [contrapartes, texto]);

  function escolher(c: { id: string; name: string }) {
    onTextoChange(c.name);
    onSelecionar(c.id);
    setAberto(false);
  }

  return (
    <Popover open={aberto && sugestoes.length > 0} onOpenChange={setAberto}>
      <PopoverAnchor asChild>
        <Input
          value={texto}
          placeholder={placeholder}
          onChange={(e) => {
            onTextoChange(e.target.value);
            onSelecionar(null);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setAberto(false)}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollArea className="max-h-48">
          {sugestoes.map((c) => (
            <button
              key={c.id}
              type="button"
              // onMouseDown, não onClick: dispara antes do blur do input,
              // senão o Popover fecha (por causa do onBlur) antes de
              // registrar a escolha.
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(c);
              }}
              className="hover:bg-muted w-full rounded-md px-2 py-1.5 text-left text-sm"
            >
              {c.name}
            </button>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
