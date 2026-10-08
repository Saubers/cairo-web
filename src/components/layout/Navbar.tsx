import { createClient } from "@/lib/supabase/server";
import { NavbarClient } from "@/components/layout/NavbarClient";

/**
 * Server Component wrapper: resolves the current user server-side (via the
 * cookie-based Supabase client) and hands it down to `NavbarClient`. Doing
 * the auth check here — before any HTML is sent — means the account
 * icon/menu never needs a client-side loading state or session check.
 */
export async function Navbar() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // `full_name` lives in `profiles`, not in the auth user's metadata — the
  // "Mi Cuenta" edit flow only ever writes to `profiles.full_name`, so that
  // table (not `user.user_metadata`, which would go stale after an edit) is
  // the single source of truth for the greeting shown in `UserMenu`.
  let fullName: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle<{ full_name: string | null }>();

    fullName = profile?.full_name ?? null;
  }

  return <NavbarClient user={user} fullName={fullName} />;
}
