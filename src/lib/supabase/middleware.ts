import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";

/**
 * Rotas acessíveis sem sessão. `/api` inclui o cron do resumo mensal — ele
 * roda em background, sem cookie de usuário nenhum, e se protege sozinho
 * checando CRON_SECRET; qualquer rota de API que precisar de um usuário
 * logado chama requireSession() internamente, como as Server Actions já
 * fazem.
 */
const PUBLIC_PATHS = ["/login", "/auth", "/api"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Não colocar nada entre criar o cliente e este getUser(): é ele que renova
  // o token e evita logout aleatório no meio do uso.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Supabase fora do ar ou variáveis ainda não configuradas: deixa passar e
    // que a própria página decida — cada rota protegida chama requireSession().
    return response;
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
