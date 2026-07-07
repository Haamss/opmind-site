import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase CÔTÉ SERVEUR (Route Handlers).
 *
 * Le repo n'avait qu'un client navigateur (lib/supabase.ts / createBrowserClient).
 * Ici on lit la session déposée en cookies par ce client navigateur via
 * createServerClient + next/headers → la requête s'exécute sous l'IDENTITÉ RLS
 * de l'appelant. Aucune escalade : les policies range_log_entries /
 * instructor_shooters s'appliquent telles quelles (appelant non lié → vide).
 */
export async function getServerSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars manquantes : NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // GET en lecture : un éventuel refresh de token essaie d'écrire des
        // cookies. Toléré en Route Handler ; on ignore si le contexte est en
        // lecture seule (pas de crash de l'export).
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* contexte lecture seule — ignoré */
        }
      },
    },
  });
}
