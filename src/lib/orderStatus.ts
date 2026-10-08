import type { OrderStatus } from "@/types";

/**
 * Human label + badge color for every order status, shared by the admin
 * "Pedidos" list and detail pages. Colors follow the PENDING=yellow,
 * PAID=green convention; `in_process` (there is no distinct "shipped"
 * status in the schema) takes the blue slot since it is the closest
 * lifecycle stage to "order is being fulfilled".
 */
export const ORDER_STATUS_BADGE: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-800" },
  in_process: { label: "En proceso", className: "bg-blue-100 text-blue-800" },
  paid: { label: "Pagado", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Rechazado", className: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelado", className: "bg-cairo-text/10 text-cairo-text/50" },
};

/** Options for the admin order-status `<select>`, in logical lifecycle order. */
export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "in_process", label: "En proceso" },
  { value: "paid", label: "Pagado" },
  { value: "rejected", label: "Rechazado" },
  { value: "cancelled", label: "Cancelado" },
];
