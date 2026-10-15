"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toSafeErrorMessage, type ActionResult } from "@/lib/actionResult";
import { ADMIN_ORDERS_EXPORT_LIMIT, getOrderForAdmin, getOrdersForAdmin } from "@/services/orderService";
import { ORDER_STATUS_BADGE } from "@/lib/orderStatus";
import { sendShippingEmail } from "@/lib/email";
import type { OrderStatus } from "@/types";

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

// -----------------------------------------------------------------------------
// Note on authorization: this runs through the anon-key Supabase client
// (`@/lib/supabase/server`), so the write is governed entirely by the
// `orders_admin_write` RLS policy (`is_admin()`) — same pattern as
// `src/app/admin/products/actions.ts`.
//
// Note on error handling: returns `{ error }` instead of throwing, so raw
// Postgres error messages never reach the client.
// -----------------------------------------------------------------------------

/** Payload accepted by `updateOrderStatus`; tracking fields only apply to "shipped". */
export interface UpdateOrderStatusInput {
  orderId: string;
  status: OrderStatus;
  trackingNumber?: string;
  shippingProvider?: string;
}

/**
 * Updates an order's lifecycle status from the admin detail page. When the
 * new status is `"shipped"`, also persists the carrier + tracking number and
 * fires the (stubbed) shipping notification email.
 */
export async function updateOrderStatus({
  orderId,
  status,
  trackingNumber,
  shippingProvider,
}: UpdateOrderStatusInput): Promise<ActionResult> {
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = { status };
  if (status === "shipped") {
    updatePayload.tracking_number = trackingNumber;
    updatePayload.shipping_provider = shippingProvider;
  }

  const { error } = await supabase.from("orders").update(updatePayload).eq("id", orderId);

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo actualizar el estado del pedido.") };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  // A failed notification must never roll back or block the status update
  // that already succeeded above — see `sendShippingEmail`'s own docstring.
  //
  // [EDGE SAFETY] The `await` on `sendShippingEmail` below is deliberate and
  // required, not optional cleanliness: this Server Action runs as a
  // Cloudflare Worker, and a Worker's request context is torn down as soon
  // as the action's returned promise settles. Omitting the `await` (i.e.
  // calling `sendShippingEmail(...)` without it, "fire and forget") would
  // let this function return — and the Worker tear itself down — while the
  // network call to Resend's API is still in flight, silently cancelling
  // it before the email is ever sent. `sendShippingEmail` itself never
  // throws (it logs its own failures), so this `try/catch` only guards
  // `getOrderForAdmin` above it.
  if (status === "shipped" && trackingNumber && shippingProvider) {
    try {
      const result = await getOrderForAdmin(orderId);
      if (result?.order.guestEmail) {
        await sendShippingEmail(
          orderId,
          result.order.guestEmail,
          trackingNumber,
          shippingProvider,
          result.order.guestName,
        );
      }
    } catch (emailError) {
      console.error("Failed to send shipping notification email:", emailError);
    }
  }

  return {};
}

/** Flat, Spanish-labeled row shape for the orders CSV export. */
export interface OrderExportRow {
  Orden: string;
  Cliente: string;
  Fecha: string;
  Estado: string;
  Total: number;
}

/** Date range accepted by both the orders list and its CSV export. */
export interface OrderExportFilters {
  startDate?: string;
  endDate?: string;
}

/**
 * Builds the CSV rows for the admin orders export, re-querying Supabase
 * with the same `startDate`/`endDate` range currently active on the list
 * page. Uses `ADMIN_ORDERS_EXPORT_LIMIT` instead of the list's
 * `ADMIN_ORDERS_LIMIT` — the export should capture every order in the
 * selected range, not just the most recent 50.
 */
export async function exportOrdersForCsv(filters: OrderExportFilters = {}): Promise<OrderExportRow[]> {
  const orders = await getOrdersForAdmin({ ...filters, limit: ADMIN_ORDERS_EXPORT_LIMIT });

  return orders.map((order) => ({
    Orden: `#${order.id.slice(0, 8).toUpperCase()}`,
    Cliente: order.customerEmail ?? "-",
    Fecha: DATE_FORMATTER.format(new Date(order.createdAt)),
    Estado: ORDER_STATUS_BADGE[order.status].label,
    Total: order.total,
  }));
}
