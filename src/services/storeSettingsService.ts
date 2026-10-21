import { createClient } from "@supabase/supabase-js";
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_RATE } from "@/lib/shipping";
import { DEFAULT_SHIPPING_ZONE_SETTINGS } from "@/lib/shippingZones";

/**
 * How long a cached `store_settings` read may be served before the next
 * request triggers a fresh Supabase fetch. `store_settings` changes at most
 * a few times a year from `/admin/configuracion` — the admin actions below
 * also call `invalidateStoreSettingsCache()` on save for instant read-your-
 * own-writes, so this window only matters as a safety net, not the primary
 * invalidation path.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface StoreSettings {
  id: string;
  /** @deprecated No longer used to compute the checkout total — superseded by the zone-based fields below. Kept for backwards compatibility until an admin decides what (if anything) to use it for. */
  freeShippingThreshold: number;
  /** @deprecated See `freeShippingThreshold`. */
  flatShippingRate: number;
  /** Postal code treated as "local" (free shipping / showroom pickup). */
  localPostalCode: string;
  /** Zone 1 (local) shipping cost in ARS. */
  shippingCostLocal: number;
  /** Zone 3 (near: Centro/PBA/CABA) shipping cost in ARS. */
  shippingCostNear: number;
  /** Zone 2 (far: North/South) shipping cost in ARS. */
  shippingCostFar: number;
}

interface StoreSettingsRow {
  id: string;
  free_shipping_threshold: number;
  flat_shipping_rate: number;
  local_postal_code: string;
  shipping_cost_local: number;
  shipping_cost_near: number;
  shipping_cost_far: number;
}

const SETTINGS_COLUMNS =
  "id, free_shipping_threshold, flat_shipping_rate, local_postal_code, shipping_cost_local, shipping_cost_near, shipping_cost_far";

const FALLBACK_SETTINGS: StoreSettings = {
  id: "",
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  flatShippingRate: FLAT_SHIPPING_RATE,
  ...DEFAULT_SHIPPING_ZONE_SETTINGS,
};

// [PERF] A plain, stateless anon-key client — NOT the cookie-aware one from
// `@/lib/supabase/server`. `store_settings` is readable by anyone
// (`store_settings_public_read`), so no session/cookie is ever needed to
// read it, which also keeps this module free of any per-request dynamic API
// (`cookies()`/`headers()`), so the module-scoped cache below can safely be
// shared across every request/route handled by the same warm Worker
// instance, not just the one that happened to trigger it.
const publicSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// [PERF — fixes Cloudflare error 1102] Module-scoped, in-memory cache for
// the single `store_settings` row, keyed by nothing (there is only ever one
// row). Before this cache existed, every single page load (via
// `RootLayout`) triggered a brand-new `store_settings` round-trip to
// Supabase — not just checkout. On Cloudflare's Edge runtime that extra
// network-bound await, multiplied across every route on the site, was
// consuming enough wall-clock/CPU budget to trip the Worker's resource
// limit.
//
// A hand-rolled cache (rather than `unstable_cache`) is used deliberately:
// `unstable_cache` is deprecated as of Next.js 16 in favor of the `"use
// cache"` directive, which requires opting the entire app into the
// `cacheComponents` config flag — too large a blast radius for a targeted
// fix. This cache has the same practical characteristics `unstable_cache`'s
// default in-memory handler would have on a serverless/Edge platform like
// Cloudflare Pages: best-effort, persists only across requests handled by
// the same warm Worker instance, and cleared on a cold start.
let cachedSettings: StoreSettings | null = null;
let cachedAt = 0;

/**
 * Invalidates the in-memory `store_settings` cache immediately. Called by
 * both admin actions on a successful save, so an admin's own change is
 * reflected on their very next read (read-your-own-writes) instead of
 * waiting out `CACHE_TTL_MS`.
 */
export function invalidateStoreSettingsCache(): void {
  cachedSettings = null;
  cachedAt = 0;
}

function rowToSettings(data: StoreSettingsRow): StoreSettings {
  return {
    id: data.id,
    freeShippingThreshold: Number(data.free_shipping_threshold),
    flatShippingRate: Number(data.flat_shipping_rate),
    localPostalCode: data.local_postal_code,
    shippingCostLocal: Number(data.shipping_cost_local),
    shippingCostNear: Number(data.shipping_cost_near),
    shippingCostFar: Number(data.shipping_cost_far),
  };
}

/**
 * Reads the single `store_settings` row, served from the in-memory cache on
 * every request except a cache miss (cold start, past `CACHE_TTL_MS`, or
 * right after `invalidateStoreSettingsCache()` runs from an admin save).
 *
 * Falls back to hardcoded defaults (with an empty `id`, which the admin
 * form treats as "not editable yet") if the row is missing OR if the
 * underlying query fails — a transient Supabase outage must degrade to
 * default pricing instead of crashing every page on the site, since
 * `RootLayout` calls this on every request to seed `StoreSettingsProvider`.
 * The row is always seeded by migration, so either branch is only a safety
 * net, not an expected path.
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  if (cachedSettings && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedSettings;
  }

  const { data, error } = await publicSupabase
    .from("store_settings")
    .select(SETTINGS_COLUMNS)
    .limit(1)
    .maybeSingle<StoreSettingsRow>();

  if (error) {
    console.error("[getStoreSettings] Failed to fetch store settings, using fallback defaults:", error);
    // Not cached: a transient outage should not pin every subsequent
    // request to the fallback for the full TTL once Supabase recovers.
    return FALLBACK_SETTINGS;
  }

  const settings = data ? rowToSettings(data) : FALLBACK_SETTINGS;
  cachedSettings = settings;
  cachedAt = Date.now();

  return settings;
}
