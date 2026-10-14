import { createClient } from "@/lib/supabase/server";
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_RATE } from "@/lib/shipping";

export interface StoreSettings {
  id: string;
  freeShippingThreshold: number;
  flatShippingRate: number;
}

interface StoreSettingsRow {
  id: string;
  free_shipping_threshold: number;
  flat_shipping_rate: number;
}

/**
 * Reads the single `store_settings` row via the cookie-aware (anon-key)
 * client — readable by anyone thanks to `store_settings_public_read`.
 *
 * Falls back to the hardcoded `@/lib/shipping` defaults (with an empty
 * `id`, which the admin form treats as "not editable yet") if the row is
 * somehow missing. It's always seeded by migration, so this is only a
 * safety net, not an expected path.
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("store_settings")
    .select("id, free_shipping_threshold, flat_shipping_rate")
    .limit(1)
    .maybeSingle<StoreSettingsRow>();

  if (error) {
    throw new Error(`Failed to fetch store settings: ${error.message}`);
  }

  if (!data) {
    return { id: "", freeShippingThreshold: FREE_SHIPPING_THRESHOLD, flatShippingRate: FLAT_SHIPPING_RATE };
  }

  return {
    id: data.id,
    freeShippingThreshold: Number(data.free_shipping_threshold),
    flatShippingRate: Number(data.flat_shipping_rate),
  };
}
