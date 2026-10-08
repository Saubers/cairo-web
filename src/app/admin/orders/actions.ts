"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toSafeErrorMessage, type ActionResult } from "@/lib/actionResult";
import type { OrderStatus } from "@/types";

// -----------------------------------------------------------------------------
// Note on authorization: this runs through the anon-key Supabase client
// (`@/lib/supabase/server`), so the write is governed entirely by the
// `orders_admin_write` RLS policy (`is_admin()`) — same pattern as
// `src/app/admin/products/actions.ts`.
//
// Note on error handling: returns `{ error }` instead of throwing, so raw
// Postgres error messages never reach the client.
// -----------------------------------------------------------------------------

/** Updates an order's lifecycle status from the admin detail page. */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo actualizar el estado del pedido.") };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}
