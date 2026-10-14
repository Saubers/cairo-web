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
  // The storefront's `useStoreSettings` hook reads this table live, and
  // `/api/checkout` re-fetches it on every request — no other path needs
  // revalidating for the new values to take effect.
  return {};
}
