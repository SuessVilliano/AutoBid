import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseEnabled } from "./env";

type CookieEntry = { name: string; value: string; options: CookieOptions };

export function getServerSupabase() {
  if (!supabaseEnabled) return null;
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (entries: CookieEntry[]) => {
        try {
          entries.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options });
          });
        } catch {
          // ignore — read-only context (Server Component without a route handler)
        }
      },
    },
  });
}
