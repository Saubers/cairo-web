"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toSafeErrorMessage, type ActionResult } from "@/lib/actionResult";
import { ADMIN_ORDERS_EXPORT_LIMIT, getOrdersForAdmin } from "@/services/orderService";
import { ORDER_STATUS_BADGE } from "@/lib/orderStatus";
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
