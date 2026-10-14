import type { OrderStatus } from "@/types";

/**
 * Human label + badge color for every order status, shared by the admin
 * "Pedidos" list and detail pages. Colors follow the PENDING=yellow,
 * PAID=green convention; `shipped` takes the purple slot so it's visually
 * distinct from both `in_process` (pre-payment fulfillment) and `paid`.
 */
export const ORDER_STATUS_BADGE: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-800" },
  in_process: { label: "En proceso", className: "bg-blue-100 text-blue-800" },
  paid: { label: "Pagado", className: "bg-emerald-100 text-emerald-800" },
  shipped: { label: "Enviado", className: "bg-purple-100 text-purple-800" },
  rejected: { label: "Rechazado", className: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelado", className: "bg-cairo-text/10 text-cairo-text/50" },
};

/** Options for the admin order-status `<select>`, in logical lifecycle order. */
export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "in_process", label: "En proceso" },
  { value: "paid", label: "Pagado" },
  { value: "shipped", label: "Enviado" },
  { value: "rejected", label: "Rechazado" },
  { value: "cancelled", label: "Cancelado" },
];
