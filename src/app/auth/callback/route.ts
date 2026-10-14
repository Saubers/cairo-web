import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_NEXT_PATH = "/";

/**
 * Only accepts a relative, same-origin path as the post-login destination —
 * guards against an open-redirect attack via a crafted `next` query param
 * (e.g. `next=https://evil.com` or the protocol-relative `next=//evil.com`).
 */
function sanitizeNextPath(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return DEFAULT_NEXT_PATH;
  }

  return path;
}

/**
 * PKCE callback for Supabase email links (signup confirmation today; any
 * other `emailRedirectTo`-based flow can reuse it going forward).
 *
 * This exchanges the `code` query param for a real session *server-side*,
 * writing the session cookies directly onto this response, before issuing
 * the redirect — so the very next render (the `Navbar` Server Component
 * included) already sees the authenticated session on first paint.
 *
 * Relying on the browser Supabase client's own `detectSessionInUrl` instead
 * (i.e. skipping this route and sending the email link straight to a page)
 * only updates the session client-side, after hydration — one render too
 * late for the HTML the server already sent. That mismatch is exactly what
 * made the account icon look logged-out until a manual reload.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const message = encodeURIComponent("El enlace no es válido o ya expiró.");
  return NextResponse.redirect(new URL(`/auth/login?message=${message}`, origin));
}
