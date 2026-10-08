import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card } from "@/components/admin/ui/Card";
import { AdminOrderRow } from "@/components/admin/AdminOrderRow";
import { getOrdersForAdmin } from "@/services/orderService";
import { ORDER_STATUS_BADGE } from "@/lib/orderStatus";

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
});

const ORDERS_LIMIT = 50;

/**
 * Admin orders list (Server Component). Capped at `ORDERS_LIMIT` most
 * recent orders — see `getOrdersForAdmin` for the pagination rationale.
 */
export default async function AdminOrdersPage() {
  const orders = await getOrdersForAdmin(ORDERS_LIMIT);

  return (
    <div>
      <PageHeader
        title="Pedidos"
        description={`Los ${ORDERS_LIMIT} pedidos más recientes de la tienda.`}
      />

      <Card className="mt-6 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cairo-text/10 text-xs uppercase tracking-wide text-cairo-text/50">
              <th className="px-6 py-3">Orden</th>
              <th className="px-6 py-3">Cliente</th>
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const status = ORDER_STATUS_BADGE[order.status];

              return (
                <AdminOrderRow key={order.id} href={`/admin/orders/${order.id}`}>
                  <td className="px-6 py-4 font-mono text-xs text-cairo-text/60">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 text-cairo-text/80">{order.customerEmail ?? "—"}</td>
                  <td className="px-6 py-4 text-cairo-text/70">
                    {DATE_FORMATTER.format(new Date(order.createdAt))}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-cairo-text">
                    {PRICE_FORMATTER.format(order.total)}
                  </td>
                </AdminOrderRow>
              );
            })}

            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-cairo-text/50">
                  Todavía no hay pedidos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
