"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "@/lib/validation/authSchemas";

// Same fallback as `app/layout.tsx` — keeps local dev working without the
// env var set, while production always has `NEXT_PUBLIC_SITE_URL` defined.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Supabase's raw `AuthError.message` is in English and sometimes too
 * technical to show a customer directly (e.g. "User already registered").
 * This maps the handful of messages we can expect from `signUp` to a
 * friendly, Spanish message; anything unrecognized falls back to the raw
 * message rather than hiding it, so a genuinely unexpected error is never
 * silently swallowed.
 */
function toFriendlySignupError(message: string): string {
  if (message.toLowerCase().includes("already registered")) {
    return "El correo ya está registrado.";
  }

  return message;
}

/**
 * Result returned by the auth Server Actions. `login`/`logout` return an
 * empty object on success (the caller does a hard `window.location`
 * navigation itself); `signup` still calls `redirect()` on success since it
 * navigates to a different, unauthenticated route.
 */
export interface AuthActionResult {
  error?: string;
}

export async function login(values: unknown): Promise<AuthActionResult> {
  // Re-validate on the server — the client-side `react-hook-form` + zod
  // check is a UX convenience only, never the security boundary.
  const parsed = loginSchema.safeParse(values);

  if (!parsed.success) {
    return { error: "Completá los campos correctamente." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Supabase's own error message is safe to surface here (e.g. "Invalid
    // login credentials") — it never reveals whether the email exists.
    return { error: error.message };
  }

  // Bust the cached root layout. This action deliberately does NOT
  // `redirect()` — the caller (`LoginForm`) does a hard `window.location`
  // navigation instead of a Next.js client-side transition, which is the
  // only way to guarantee every Server Component re-reads the freshly-set
  // session cookie from a brand-new document fetch.
  revalidatePath("/", "layout");
  return {};
}

export async function signup(values: unknown): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(values);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados." };
  }

  const { fullName, email, password } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      // Sends the confirmation link through `/auth/callback`, which
      // exchanges the PKCE code for a session server-side before
      // redirecting — see that route for why this matters.
      emailRedirectTo: `${SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: toFriendlySignupError(error.message) };
  }

  // Same reasoning as in `login`: if email confirmation is disabled,
  // `signUp` already creates a session, so the layout needs to be
  // revalidated to pick up the new cookie before the redirect renders.
  revalidatePath("/", "layout");
  redirect(
    `/auth/login?message=${encodeURIComponent("Revisá tu email para confirmar la cuenta.")}`,
  );
}

/**
 * Signs the user out. Deliberately does NOT call `redirect()` here — this
 * action is invoked directly from a plain `onClick` handler (not a
 * `<form action>`), and `redirect()` is only reliably processed when a
 * Server Action is dispatched through React's transition machinery.
 * Navigation is the caller's responsibility (see `UserMenu`, which forces a
 * hard `window.location.href` reload so the `Navbar` Server Component is
 * guaranteed to re-run with the cleared cookie, nuking any client cache).
 */
export async function logout(): Promise<AuthActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  // Same reasoning as in `login`/`signup`: bust the cached root layout so
  // the `Navbar` Server Component re-runs with the cleared session cookie
  // once the caller triggers navigation.
  revalidatePath("/", "layout");
  return {};
}
