/**
 * Espelha normalize_description() do banco (supabase/schema.sql): minúsculas,
 * sem acento, sem pontuação, espaços colapsados.
 *
 * Mora aqui, e não em `lib/import/normalize.ts`, porque aquele módulo importa
 * `node:crypto` (para fingerprint e hash de arquivo) e esta função precisa
 * ser usada por `lib/constants.ts`, que é importado por componentes client —
 * arrastar `node:crypto` para o bundle do navegador quebraria o build.
 */
const MARCAS_DIACRITICAS = /[̀-ͯ]/g;

export function normalizeDescription(text: string): string {
  return text
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
