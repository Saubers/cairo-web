"use client";

import { useEffect, useState } from "react";

/**
 * Returns `true` only after the component has mounted on the client.
 *
 * Use this to gate any render branch that reads `localStorage`, `window`, or
 * other browser-only state: both the server render and the client's first
 * paint see `false` and therefore render the exact same markup, so the real
 * (browser-only) branch only ever appears after hydration has already
 * completed — never during it. This is the single reusable primitive for the
 * "hydration-safe mount flag" pattern used across the storefront.
 */
export function useIsMounted(): boolean {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Deferred to a microtask (not called synchronously in the effect body)
    // to satisfy the `react-hooks/set-state-in-effect` lint rule — same
    // reasoning already applied to the Supabase `.then()` callbacks in
    // `useProductsStock.ts`.
    Promise.resolve().then(() => setIsMounted(true));
  }, []);

  return isMounted;
}
