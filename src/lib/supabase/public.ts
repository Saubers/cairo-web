import { createClient } from "@supabase/supabase-js";

/**
 * Stateless, anon-key Supabase client — no cookies, no session. Required
 * (and safe) inside any data-access function wrapped in `unstable_cache`:
 * Next.js forbids reading cookies/headers inside a cached function, and
 * every read this client is used for is already governed by a
 * `*_public_read` RLS policy that never depends on the caller's session.
 *
 * Never use this for admin-only reads (e.g. inactive products visible only
 * to `is_admin()`) — those still need the cookie-bound client from
 * `@/lib/supabase/server` to carry the admin's session to RLS.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
