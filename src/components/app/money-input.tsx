"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseBRL } from "@/lib/money";
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
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const invalido = value.trim() !== "" && parseBRL(value) === null;

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
          R$
        </span>
        <Input
          id={id}
          inputMode="decimal"
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn("pl-9 tabular-nums", invalido && "border-destructive")}
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
