import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy Next 16 (ex-middleware) — refresh de session Supabase.
 *
 * POURQUOI CE FICHIER EST OBLIGATOIRE : sans lui, aucun refresh de token
 * n'est persisté de façon fiable côté serveur. Symptôme observé (07/2026) :
 * access token expiré → la route /api/carnet/pdf tente le refresh, la
 * rotation consomme le refresh token, l'écriture cookie échoue ou perd la
 * course contre l'onglet navigateur → cookie mort → AuthApiError
 * `refresh_token_not_found` et 401 en boucle jusqu'à reconnexion manuelle.
 *
 * Ce proxy rafraîchit la session à CHAQUE requête et resynchronise les
 * cookies dans la requête ET la réponse. Le `catch` silencieux de
 * lib/supabaseServer.ts (setAll) n'est sûr qu'avec ce fichier présent.
 *
 * NOTE Next 16 : `middleware.ts` est ignoré sans erreur — ne pas renommer.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Env manquante : ne pas bloquer la requête, l'erreur explicite
    // sera levée par les clients Supabase en aval.
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT : getUser() (validation côté serveur Supabase), jamais
  // getSession() ici — c'est cet appel qui déclenche le refresh et la
  // réécriture des cookies rotés.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Tout sauf les assets statiques et les images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
