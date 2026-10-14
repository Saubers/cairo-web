import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Card } from "@/components/admin/ui/Card";
import { AdminOrderRow } from "@/components/admin/AdminOrderRow";
import { ExportOrdersButton } from "@/components/admin/ExportOrdersButton";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { ADMIN_ORDERS_LIMIT, getOrdersForAdmin } from "@/services/orderService";
import { ORDER_STATUS_BADGE } from "@/lib/orderStatus";
import { readStringParam } from "@/lib/searchParams";

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
});

/**
 * Admin orders list (Server Component). Capped at `ADMIN_ORDERS_LIMIT` most
 * recent orders — see `getOrdersForAdmin` for the pagination rationale.
 * Optionally scoped to a `created_at` date range via the `startDate`/
 * `endDate` URL search params, set by `DateRangeFilter`.
 */
export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  const searchParams = await props.searchParams;
  const startDate = readStringParam(searchParams, "startDate");
  const endDate = readStringParam(searchParams, "endDate");

  const orders = await getOrdersForAdmin({ startDate, endDate });

  return (
    // `min-w-0` lets this column shrink below the table's intrinsic width instead of
    // forcing the page wider; `gap-4` replaces the children's old individual `mt-*`
    // margins now that spacing is handled uniformly by the flex column.
    <div className="flex w-full min-w-0 flex-col gap-4">
      <PageHeader
        title="Pedidos"
        description={`Los ${ADMIN_ORDERS_LIMIT} pedidos más recientes de la tienda.`}
        action={<ExportOrdersButton startDate={startDate} endDate={endDate} />}
      />

      <DateRangeFilter />

      <Card className="overflow-hidden">
        {/* Horizontal scroll wrapper: lets admins swipe sideways on mobile to see every
            column instead of the table squashing/breaking the page layout. `min-w-0`
            keeps this wrapper itself shrinkable so `overflow-x-auto` is what activates,
            not a page-wide blowout. */}
        <div className="w-full min-w-0 overflow-x-auto">
        {/* `table-fixed` + explicit `<th>` widths freeze the column layout regardless of cell
            content, so the table never recalculates its widths (and stutters) row to row. */}
        <table className="w-full min-w-[800px] table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-cairo-text/10 text-xs uppercase tracking-wide text-cairo-text/50">
              <th className="w-32 px-6 py-3">Orden</th>
              <th className="w-1/3 px-6 py-3">Cliente</th>
              <th className="w-32 px-6 py-3">Fecha</th>
              <th className="w-28 px-6 py-3">Estado</th>
              <th className="w-32 px-6 py-3">Total</th>
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
                  <td className="truncate px-6 py-4 text-cairo-text/80">{order.customerEmail ?? "—"}</td>
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
        </div>
      </Card>
    </div>
  );
}
