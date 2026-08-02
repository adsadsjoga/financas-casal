import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

/**
 * Cliente com a service_role: ignora TODO o RLS. Só existe porque um job em
 * background (o cron do resumo mensal) não tem sessão de usuário nenhuma —
 * sem isso, toda consulta voltaria vazia, RLS bloqueando por padrão.
 *
 * NUNCA importar isto de um Client Component, de uma Server Action comum,
 * ou de qualquer rota que não seja explicitamente protegida por CRON_SECRET.
 * `server-only` já barra o import do lado do cliente; o resto é disciplina.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada — necessária só para o cron do resumo mensal.",
    );
  }

  return createSupabaseClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
