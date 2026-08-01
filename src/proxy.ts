import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/** No Next 16 o antigo `middleware` chama-se `proxy`. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Tudo, menos assets estáticos e arquivos do PWA (o service worker precisa
     * ser servido sem passar pelo redirect de login).
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
