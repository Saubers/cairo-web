/**
 * Standard shape returned by mutating Server Actions. Actions resolve this
 * instead of throwing, so the client never has to wrap every call in
 * try/catch — it just checks `result.error` and feeds it to `toast.error`.
 */
export interface ActionResult {
  error?: string;
}

/** Minimal shape of a Supabase/Postgres error — avoids depending on the full `PostgrestError` type. */
interface DatabaseError {
  code?: string;
  message: string;
}

/**
 * Maps a Supabase/Postgres error to a safe, user-facing message. The raw
 * `error.message` (which can leak table/column names or constraint details)
 * is never forwarded to the client — only a small set of known Postgres
 * error codes get a tailored message, everything else falls back to the
 * caller-provided generic one.
 */
export function toSafeErrorMessage(error: DatabaseError, fallback: string): string {
  // 23505 = unique_violation (e.g. a duplicate slug).
  if (error.code === "23505") {
    return "Ya existe un registro con ese nombre. Elegí uno distinto.";
  }

  return fallback;
}
