import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for use in Server Components, Server Actions,
 * and Route Handlers.
 *
 * It reads and writes the auth session through Next.js cookies, so the
 * server always sees the same session as the browser. Like the browser
 * client, it uses the anon key — access is governed by RLS, never bypassed
 * here. The service-role key (which does bypass RLS) is reserved for the
 * isolated Node.js business logic layer only (see architecture.md).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // `setAll` can be called from a Server Component, where cookies
            // are read-only. This is safe to ignore as long as session
            // refresh is also handled in middleware.
          }
        },
      },
    },
  );
}
