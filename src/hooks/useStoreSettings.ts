"use client";

import { useStoreSettingsContext, type StoreSettingsValues } from "@/providers/StoreSettingsProvider";

export type { StoreSettingsValues };

/**
 * Reads the live `store_settings` row.
 *
 * Backed by `StoreSettingsProvider`, which `RootLayout` (a Server Component)
 * initializes with a server-fetched snapshot — so this hook never performs
 * its own client-side fetch and never returns a hardcoded default before
 * "the real" value arrives. That eliminates both the fetch flash and any
 * risk of a hydration mismatch: server and client render the same value from
 * the very first paint.
 */
export function useStoreSettings(): StoreSettingsValues {
  return useStoreSettingsContext();
}
