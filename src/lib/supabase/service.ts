import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely —
 * reserved for trusted server-only business logic (e.g. order creation in
 * `app/api/checkout/route.ts`) that must recompute "source of truth" data
 * rather than trusting client input.
 *
 * `serviceKey` is a required parameter rather than being read internally
 * from `process.env` here. This forces every caller to resolve (and, where
 * it matters, validate the presence of) the key itself before this client
 * is ever constructed, instead of silently swallowing an `undefined` value
 * into the Supabase SDK — which is what previously surfaced as the opaque
 * `"supabaseKey is required."` error.
 *
 * The `server-only` import makes it a build error to pull this module into
 * any Client Component bundle. Never pass the client instance itself (or
 * its results) back to the browser unfiltered.
 */
export function createServiceClient(serviceKey: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
