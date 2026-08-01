import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";

/**
 * Cliente para Server Components, Server Actions e Route Handlers.
 * Em Server Components a escrita de cookie é ignorada (o middleware é quem
 * renova a sessão), por isso o try/catch vazio abaixo é intencional.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component: o middleware já cuidou de renovar a sessão.
          }
        },
      },
    },
  );
}
