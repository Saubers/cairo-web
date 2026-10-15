import { createClient } from "@/lib/supabase/server";
import { CartPageClient } from "@/components/cart/CartPageClient";

// The cart reflects live, per-user session state (auth + in-flight checkout
// intent) and must never be served from a cached render — explicit here
// even though the `auth.getUser()` call below already opts this page out of
// static rendering implicitly.
export const dynamic = "force-dynamic";

/**
 * Server Component wrapper: resolves auth state server-side (via the
 * cookie-based Supabase client) so `CartPageClient` knows up front whether
 * to soft-gate checkout behind `GuestCheckoutModal` — mirrors the
 * `Navbar`/`NavbarClient` pattern, avoiding any client-side session check.
 */
export default async function CartPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <CartPageClient isLoggedIn={!!user} />;
}
