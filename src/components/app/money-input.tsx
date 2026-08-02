"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MOEDAS, MOEDA_PADRAO, ehMoedaConhecida, parseBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Campo de dinheiro que guarda TEXTO e converte só na hora de salvar.
 * Formatar enquanto o usuário digita atrapalha mais do que ajuda no celular
 * (o cursor pula), então aqui a validação é só um aviso discreto embaixo.
 */
export function MoneyInput({
  label,
  value,
  onChange,
  required,
  placeholder = "0,00",
  className,
  id: idProp,
  currency = MOEDA_PADRAO,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  /** Moeda da conta a que este valor pertence — define o símbolo mostrado. */
  currency?: string;
}) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const invalido = value.trim() !== "" && parseBRL(value) === null;
  const simbolo = ehMoedaConhecida(currency) ? MOEDAS[currency].simbolo : currency;

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
          {simbolo}
        </span>
        <Input
          id={id}
          inputMode="decimal"
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn("pl-11 tabular-nums", invalido && "border-destructive")}
        />
      </div>
      {invalido && (
        <p className="text-destructive text-xs">
          Não entendi esse valor. Use algo como 1.234,56
        </p>
      )}
    </div>
  );
}
