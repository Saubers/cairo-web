"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_RATE } from "@/lib/shipping";

export interface StoreSettingsValues {
  freeShippingThreshold: number;
  flatShippingRate: number;
}

interface StoreSettingsRow {
  free_shipping_threshold: number;
  flat_shipping_rate: number;
}

/**
 * Client-side hook that reads the single `store_settings` row via the
 * `store_settings_public_read` RLS policy (no auth required).
 *
 * Returns the hardcoded `@/lib/shipping` constants until the fetch resolves,
 * and keeps returning them if the fetch fails — this is display/UX data
 * (the announcement bar copy, the cart's shipping preview), never the
 * authoritative charge, which the checkout route re-derives server-side.
 */
export function useStoreSettings(): StoreSettingsValues {
  const [settings, setSettings] = useState<StoreSettingsValues>({
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    flatShippingRate: FLAT_SHIPPING_RATE,
  });

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    supabase
      .from("store_settings")
      .select("free_shipping_threshold, flat_shipping_rate")
      .limit(1)
      .maybeSingle<StoreSettingsRow>()
      .then(({ data }) => {
        if (isMounted && data) {
          setSettings({
            freeShippingThreshold: Number(data.free_shipping_threshold),
            flatShippingRate: Number(data.flat_shipping_rate),
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return settings;
}
