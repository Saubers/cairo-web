import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Uses `SUPABASE_SERVICE_ROLE_KEY`, which
 * bypasses Row Level Security entirely — reserved for trusted server-only
 * business logic (e.g. order creation in `app/api/checkout/route.ts`) that
 * must recompute "source of truth" data rather than trusting client input.
 *
 * The `server-only` import makes it a build error to pull this module into
 * any Client Component bundle. Never pass the client instance itself (or
 * its results) back to the browser unfiltered.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
