"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_RATE } from "@/lib/shipping";
import { DEFAULT_SHIPPING_ZONE_SETTINGS } from "@/lib/shippingZones";

export interface StoreSettingsValues {
  /** @deprecated No longer used to compute the checkout total — superseded by the zone-based fields below. */
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
  free_shipping_threshold: number;
  flat_shipping_rate: number;
  local_postal_code: string;
  shipping_cost_local: number;
  shipping_cost_near: number;
  shipping_cost_far: number;
}

/**
 * Client-side hook that reads the single `store_settings` row via the
 * `store_settings_public_read` RLS policy (no auth required).
 *
 * Returns hardcoded fallback defaults until the fetch resolves, and keeps
 * returning them if the fetch fails — this is display/UX data (the cart's
 * live shipping preview, the product page's shipping estimator), never the
 * authoritative charge, which the checkout route re-derives server-side
 * from its own fresh read of this same table.
 */
export function useStoreSettings(): StoreSettingsValues {
  const [settings, setSettings] = useState<StoreSettingsValues>({
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    flatShippingRate: FLAT_SHIPPING_RATE,
    ...DEFAULT_SHIPPING_ZONE_SETTINGS,
  });

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    supabase
      .from("store_settings")
      .select(
        "free_shipping_threshold, flat_shipping_rate, local_postal_code, shipping_cost_local, shipping_cost_near, shipping_cost_far",
      )
      .limit(1)
      .maybeSingle<StoreSettingsRow>()
      .then(({ data }) => {
        if (isMounted && data) {
          setSettings({
            freeShippingThreshold: Number(data.free_shipping_threshold),
            flatShippingRate: Number(data.flat_shipping_rate),
            localPostalCode: data.local_postal_code,
            shippingCostLocal: Number(data.shipping_cost_local),
            shippingCostNear: Number(data.shipping_cost_near),
            shippingCostFar: Number(data.shipping_cost_far),
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return settings;
}
