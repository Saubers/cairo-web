"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toSafeErrorMessage, type ActionResult } from "@/lib/actionResult";
import {
  ADMIN_ORDERS_EXPORT_LIMIT,
  getOrderForAdmin,
  getOrdersForAdmin,
  resolveOrderRecipient,
} from "@/services/orderService";
import { ORDER_STATUS_BADGE } from "@/lib/orderStatus";
import { sendShippingEmail } from "@/lib/email";
import type { OrderStatus } from "@/types";

// Explicit `timeZone` so the exported CSV/email date matches Argentina's
// calendar day regardless of the server process's own runtime timezone.
const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeZone: "America/Argentina/Buenos_Aires",
});

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
  console.log("[ADMIN ACTION] Actualizando orden a:", status, { orderId, trackingNumber, shippingProvider });

  const supabase = await createClient();

  // [AUDIT] `status` is typed as the `OrderStatus` union
  // ("pending" | "in_process" | "paid" | "shipped" | "rejected" | "cancelled"),
  // not a free-form string — TypeScript rejects any other value at compile
  // time. `OrderStatusForm`'s <select> always submits `option.value` (the
  // lowercase literal), never the Spanish label shown to the admin
  // ("Enviado"), and the `orders_status_check` constraint
  // (20261014120000_add_order_shipping_fields.sql) stores the same
  // lowercase literal in Postgres. There is no case-mismatch here — a
  // `.toLowerCase() === "enviado"` check would in fact never match, since
  // "enviado" is never the value in play on either side of this
  // comparison. Case sensitivity was ruled out as the cause of the missing
  // email; see `resolveOrderRecipient` below for the actual bug.
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
  // `getOrderForAdmin`/`resolveOrderRecipient` above it.
  if (status === "shipped" && trackingNumber && shippingProvider) {
    console.log("[ADMIN ACTION] Condición de envío cumplida. Intentando enviar mail...");

    try {
      const result = await getOrderForAdmin(orderId);

      if (!result) {
        console.error(`[ADMIN ACTION] Order ${orderId} not found after update — cannot resolve recipient.`);
        return {};
      }

      // [ROOT CAUSE] The previous version of this code checked
      // `result.order.guestEmail` directly — that column is `null` for
      // every REGISTERED customer's order (it is only ever populated at
      // guest checkout), so for any logged-in buyer this condition was
      // always false and `sendShippingEmail` was never called — matching
      // exactly the reported symptom (no Resend logs at all, because the
      // call site was never reached). `resolveOrderRecipient` fixes this
      // by resolving the email from `auth.users` for registered customers,
      // the same way the Mercado Pago webhook's `resolveOrderRecipient`
      // does for the order-confirmation email.
      const recipient = await resolveOrderRecipient(result.order);

      if (!recipient) {
        console.error(
          `[ADMIN ACTION] Order ${orderId} has no resolvable recipient (no userId and no guestEmail) — skipping shipping email.`,
        );
        return {};
      }

      console.log(
        "[ADMIN ACTION] Verificando API Key de Resend existente:",
        !!process.env.RESEND_API_KEY,
      );
      console.log(
        `[ADMIN ACTION] Recipient resolved via "${recipient.source}" path:`,
        recipient.email,
      );

      await sendShippingEmail(orderId, recipient.email, trackingNumber, shippingProvider, recipient.name);
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
