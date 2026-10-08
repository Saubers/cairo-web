import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrdersByUserId } from "@/services/orderService";
import type { OrderStatus } from "@/types";

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
});

/** Display label + badge color for each real `orders.status` value. */
const STATUS_DISPLAY: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-cairo-text/10 text-cairo-text/70" },
  in_process: { label: "En proceso", className: "bg-cairo-accent-yellow text-cairo-text" },
  paid: { label: "Pagado", className: "bg-cairo-accent-blue/40 text-cairo-text" },
  rejected: { label: "Rechazado", className: "bg-red-50 text-red-700" },
  cancelled: { label: "Cancelado", className: "bg-cairo-text/10 text-cairo-text/50" },
};

/**
 * Customer order history (Server Component). Redirects to `/auth/login`
 * when there is no active session.
 */
export default async function MisPedidosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/mis-pedidos");
  }

  const orders = await getOrdersByUserId(user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl text-cairo-text">Mis Pedidos</h1>
      <p className="mt-2 text-sm text-cairo-text/60">Historial de tus compras en Cairo.</p>

      {orders.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-4 rounded-lg border border-cairo-text/10 bg-cairo-bg px-6 py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-cairo-text/30" />
          <div>
            <p className="font-medium text-cairo-text">Todavía no realizaste ninguna compra</p>
            <p className="mt-1 text-sm text-cairo-text/60">
              Cuando hagas tu primer pedido, lo vas a ver reflejado acá.
            </p>
          </div>
          <Link
            href="/catalogo"
            className="mt-2 rounded-full bg-cairo-primary px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Explorar el catálogo
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {orders.map((order) => {
            const status = STATUS_DISPLAY[order.status];

            return (
              <li
                key={order.id}
                className="flex flex-col gap-3 rounded-lg border border-cairo-text/10 bg-cairo-bg p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-mono text-xs tracking-wide text-cairo-text/50">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                <p className="text-xs text-cairo-text/50">
                  {DATE_FORMATTER.format(new Date(order.createdAt))}
                </p>

                <div className="mt-1 flex items-center justify-between">
                  <p className="text-lg font-semibold text-cairo-text">
                    {PRICE_FORMATTER.format(order.total)}
                  </p>

                  <Link
                    href={`/mis-pedidos/${order.id}`}
                    className="text-sm font-medium text-cairo-primary hover:underline"
                  >
                    Ver detalles
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
