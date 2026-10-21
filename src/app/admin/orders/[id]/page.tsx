import Image from "next/image";
import { notFound } from "next/navigation";
import { ImageOff } from "lucide-react";
import { BackLink } from "@/components/admin/ui/BackLink";
import { Card } from "@/components/admin/ui/Card";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { getOrderForAdmin } from "@/services/orderService";
import { ORDER_STATUS_BADGE } from "@/lib/orderStatus";

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

// Explicit `timeZone`: this is a Server Component, so the date renders once
// with whatever timezone the server process happens to run in (e.g. UTC on
// Cloudflare) unless pinned here — without it, an order placed late at night
// in Argentina (UTC-3) could render under the wrong calendar day.
const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeZone: "America/Argentina/Buenos_Aires",
});

/**
 * Admin order detail (Server Component). Renders a 404 when the order does
 * not exist — access itself is already gated by `/admin/layout.tsx`.
 */
export default async function AdminOrderDetailPage(props: PageProps<"/admin/orders/[id]">) {
  const { id } = await props.params;
  const result = await getOrderForAdmin(id);

  if (!result) {
    notFound();
  }

  const { order, items } = result;
  const status = ORDER_STATUS_BADGE[order.status];

  return (
    <div>
      <BackLink href="/admin/orders" label="Pedidos" />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-cairo-text">
            Pedido #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-cairo-text/60">
            Realizado el {DATE_FORMATTER.format(new Date(order.createdAt))}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Productos" description="Items incluidos en este pedido.">
            <ul className="divide-y divide-cairo-text/5 px-6">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-4">
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-cairo-accent-yellow/40">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageOff className="h-5 w-5 text-cairo-text/30" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium text-cairo-text">{item.productName}</p>
                    <p className="text-sm text-cairo-text/50">
                      {item.quantity} x {PRICE_FORMATTER.format(item.unitPrice)}
                    </p>
                  </div>

                  <p className="text-sm font-medium text-cairo-text">
                    {PRICE_FORMATTER.format(item.subtotal)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t border-cairo-text/5 px-6 py-4">
              <span className="text-sm font-medium text-cairo-text">Total</span>
              <span className="text-lg font-semibold text-cairo-text">
                {PRICE_FORMATTER.format(order.total)}
              </span>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Cliente" description="Datos de contacto y envío capturados en el checkout.">
            <dl className="space-y-4 px-6 py-5 text-sm">
              <div>
                <dt className="text-cairo-text/50">Nombre</dt>
                <dd className="mt-0.5 text-cairo-text">{order.guestName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-cairo-text/50">Email</dt>
                <dd className="mt-0.5 text-cairo-text">{order.guestEmail ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-cairo-text/50">Teléfono</dt>
                <dd className="mt-0.5 text-cairo-text">{order.guestPhone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-cairo-text/50">DNI/CUIL</dt>
                <dd className="mt-0.5 text-cairo-text">{order.guestDni ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-cairo-text/50">Dirección de envío</dt>
                <dd className="mt-0.5 text-cairo-text">
                  {order.guestAddressStreet} {order.guestAddressNumber}
                  {order.guestAddressFloorApt ? `, ${order.guestAddressFloorApt}` : ""}
                </dd>
                <dd className="text-cairo-text/70">
                  {order.guestAddressCity}, {order.guestAddressState}
                </dd>
                <dd className="text-cairo-text/70">CP {order.guestAddressZip}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Estado del pedido" description="Actualizá el estado para notificar el avance.">
            <div className="px-6 py-5">
              <OrderStatusForm
                orderId={order.id}
                currentStatus={order.status}
                currentTrackingNumber={order.trackingNumber}
                currentShippingProvider={order.shippingProvider}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
