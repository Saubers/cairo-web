// Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts`
// (same export shape, different name) — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
// `middleware.ts` would silently be ignored on this version, so this file
// must be named `proxy.ts` and export a `proxy` function.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_PATH_PREFIX = "/admin";
const AUTH_PATH_PREFIX = "/auth";
const LOGIN_PATH = "/auth/login";

// Password recovery deliberately signs the user in (Supabase's PKCE
// exchange in `/auth/callback` establishes a real session so the recovery
// token can be validated) before they ever see this screen. Without this
// exception, the generic "already logged in -> bounce out of /auth/*" rule
// below would redirect them away from the very form they need to set a new
// password, turning the callback's redirect into a dead end.
const AUTH_PATHS_ALLOWED_WHILE_LOGGED_IN = ["/auth/update-password"];

/**
 * Runs on (almost) every page navigation to keep the Supabase auth session
 * cookie fresh, and performs an *optimistic* role check on `/admin/*` routes.
 *
 * Per Next.js guidance, Proxy should not be relied on as the sole
 * authorization layer (it should not do slow/critical data fetching) — the
 * authoritative, non-bypassable checks are the role check in
 * `src/app/admin/layout.tsx` and the `is_admin()` RLS policies. This is
 * only the first, cheapest line of defense: it discards obviously
 * unauthenticated/non-admin requests before they reach the layout.
 *
 * Every Supabase call is wrapped in try/catch: on edge-style platforms like
 * Cloudflare Pages, a cold-start or network failure while initializing the
 * SSR client or refreshing the session must never surface as an unhandled
 * exception here, since that would crash the whole request with a 500 —
 * including on public, unauthenticated storefront routes that have nothing
 * to do with auth.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Already-logged-in visitors have no business on the login/register
    // screens — redirect at the edge, before the page even starts rendering,
    // so there is zero flash of the auth form. The page-level `redirect()` in
    // `app/auth/login/page.tsx` and `app/auth/register/page.tsx` is the
    // authoritative fallback (e.g. if this cookie-only check is ever bypassed).
    const isAllowedWhileLoggedIn = AUTH_PATHS_ALLOWED_WHILE_LOGGED_IN.some((allowedPath) =>
      pathname.startsWith(allowedPath),
    );

    if (pathname.startsWith(AUTH_PATH_PREFIX) && user && !isAllowedWhileLoggedIn) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (pathname.startsWith(ADMIN_PATH_PREFIX)) {
      if (!user) {
        return NextResponse.redirect(new URL(`${LOGIN_PATH}?redirect=/admin`, request.url));
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle<{ role: string }>();

      // A failed role lookup is treated the same as "not an admin": fail
      // closed on the protected route instead of letting a Supabase error
      // propagate into a crash.
      if (profileError || profile?.role !== "admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }

    return response;
  } catch (error) {
    console.error("Error in proxy while refreshing the Supabase session:", error);

    // A failure here (e.g. Supabase unreachable, cold-start network error)
    // must never crash the public storefront with a 500. Protected routes
    // fail closed (redirect to login); every other route proceeds without a
    // refreshed session, relying on page-level checks and RLS as the
    // authoritative layer.
    if (pathname.startsWith(ADMIN_PATH_PREFIX)) {
      return NextResponse.redirect(new URL(`${LOGIN_PATH}?redirect=/admin`, request.url));
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Run only on actual page navigations: skip Next.js internals
     * (_next/static, _next/image), favicon.ico, and any request for a
     * static asset file (identified by its file extension — images, fonts,
     * stylesheets, scripts, etc.), so Proxy never intercepts static files.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|avif|svg|css|js|woff|woff2|ttf|eot|map|txt|xml|json)$).*)",
  ],
};
