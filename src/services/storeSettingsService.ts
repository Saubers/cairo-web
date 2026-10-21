import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_RATE } from "@/lib/shipping";
import { DEFAULT_SHIPPING_ZONE_SETTINGS } from "@/lib/shippingZones";

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

/**
 * Reads the single `store_settings` row via the cookie-aware (anon-key)
 * client — readable by anyone thanks to `store_settings_public_read`.
 *
 * Falls back to hardcoded defaults (with an empty `id`, which the admin
 * form treats as "not editable yet") if the row is missing OR if the query
 * itself fails. `RootLayout` calls this on every request to seed
 * `StoreSettingsProvider`, so a transient Supabase outage must degrade to
 * default pricing instead of crashing every page on the site — the row is
 * always seeded by migration, so either branch is only a safety net, not an
 * expected path.
 *
 * Wrapped in React's `cache()` so multiple calls within the same request
 * (e.g. `RootLayout` + `/admin/configuracion`'s own page-level read) share a
 * single Supabase round-trip instead of fetching the row twice.
 */
export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("store_settings")
    .select(SETTINGS_COLUMNS)
    .limit(1)
    .maybeSingle<StoreSettingsRow>();

  if (error) {
    console.error("[getStoreSettings] Failed to fetch store settings, using fallback defaults:", error);
    return FALLBACK_SETTINGS;
  }

  if (!data) {
    return FALLBACK_SETTINGS;
  }

  return {
    id: data.id,
    freeShippingThreshold: Number(data.free_shipping_threshold),
    flatShippingRate: Number(data.flat_shipping_rate),
    localPostalCode: data.local_postal_code,
    shippingCostLocal: Number(data.shipping_cost_local),
    shippingCostNear: Number(data.shipping_cost_near),
    shippingCostFar: Number(data.shipping_cost_far),
  };
});
