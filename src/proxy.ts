// Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts`
// (same export shape, different name/location semantics) — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
// `middleware.ts` would silently be ignored on this version, so this file
// must be named `proxy.ts` and export a `proxy` function.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_PATH_PREFIX = "/admin";
const AUTH_PATH_PREFIX = "/auth";

/**
 * Runs on (almost) every request to keep the Supabase auth session cookie
 * fresh, and performs an *optimistic* role check on `/admin/*` routes.
 *
 * Per Next.js guidance, Proxy should not be relied on as the sole
 * authorization layer (it should not do slow/critical data fetching) — the
 * authoritative, non-bypassable checks are the role check in
 * `src/app/admin/layout.tsx` and the `is_admin()` RLS policies. This is
 * only the first, cheapest line of defense: it discards obviously
 * unauthenticated/non-admin requests before they reach the layout.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: this call also refreshes the session and must not be
  // removed — @supabase/ssr relies on it to rewrite the auth cookies above.
  const { data: { user } } = await supabase.auth.getUser();

  // Already-logged-in visitors have no business on the login/register
  // screens — redirect at the edge, before the page even starts rendering,
  // so there is zero flash of the auth form. The page-level `redirect()` in
  // `app/auth/login/page.tsx` and `app/auth/register/page.tsx` is the
  // authoritative fallback (e.g. if this cookie-only check is ever bypassed).
  if (request.nextUrl.pathname.startsWith(AUTH_PATH_PREFIX) && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (request.nextUrl.pathname.startsWith(ADMIN_PATH_PREFIX)) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login?redirect=/admin", request.url));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: string }>();

    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and image optimization files,
     * so the session cookie stays fresh across the whole app.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
