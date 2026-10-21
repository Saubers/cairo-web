"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toSafeErrorMessage, type ActionResult } from "@/lib/actionResult";

// -----------------------------------------------------------------------------
// Note on authorization: this write goes through the anon-key Supabase
// client, so it's governed entirely by the `store_settings_admin_write` RLS
// policy (`is_admin()`) — the same defense-in-depth model used by every
// other admin Server Action in this app.
// -----------------------------------------------------------------------------

export async function updateStoreSettings(
  id: string,
  freeShippingThreshold: number,
  flatShippingRate: number,
): Promise<ActionResult> {
  if (!Number.isFinite(freeShippingThreshold) || freeShippingThreshold < 0) {
    return { error: "El umbral de envío gratis debe ser un número positivo." };
  }

  if (!Number.isFinite(flatShippingRate) || flatShippingRate < 0) {
    return { error: "La tarifa de envío debe ser un número positivo." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("store_settings")
    .update({
      free_shipping_threshold: freeShippingThreshold,
      flat_shipping_rate: flatShippingRate,
    })
    .eq("id", id);

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo actualizar la configuración.") };
  }

  revalidatePath("/admin/configuracion");
  // `useStoreSettings` is now backed by `StoreSettingsProvider`, seeded by
  // `RootLayout`'s own `getStoreSettings()` call — revalidating the root
  // layout (not just this page) is what makes the storefront pick up the
  // new values on the next navigation/`router.refresh()`. `/api/checkout`
  // needs no revalidation since it re-fetches on every request regardless.
  revalidatePath("/", "layout");
  return {};
}

/**
 * Updates the postal-code shipping zone pricing: the actual values
 * `/api/checkout`, `CartSummary`, and `ShippingCalculator` use to charge/
 * preview shipping. Kept as its own action (rather than folded into
 * `updateStoreSettings`) so the two config blocks on `/admin/configuracion`
 * can be saved independently.
 */
export async function updateShippingZoneSettings(
  id: string,
  localPostalCode: string,
  shippingCostLocal: number,
  shippingCostNear: number,
  shippingCostFar: number,
): Promise<ActionResult> {
  if (!/^\d{4}$/.test(localPostalCode)) {
    return { error: "El código postal local debe tener 4 números." };
  }

  for (const [label, value] of [
    ["Zona local", shippingCostLocal],
    ["Zona cercana", shippingCostNear],
    ["Zona lejana", shippingCostFar],
  ] as const) {
    if (!Number.isFinite(value) || value < 0) {
      return { error: `El costo de envío de "${label}" debe ser un número positivo.` };
    }
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("store_settings")
    .update({
      local_postal_code: localPostalCode,
      shipping_cost_local: shippingCostLocal,
      shipping_cost_near: shippingCostNear,
      shipping_cost_far: shippingCostFar,
    })
    .eq("id", id);

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo actualizar la configuración de envíos.") };
  }

  revalidatePath("/admin/configuracion");
  // See the matching comment in `updateStoreSettings` above: revalidates
  // `RootLayout` itself so `StoreSettingsProvider`'s snapshot (and therefore
  // every `useStoreSettings()` consumer) picks up the new zone pricing.
  revalidatePath("/", "layout");
  return {};
}
