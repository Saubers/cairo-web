import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrderWithItems } from "@/services/orderService";
import { TrackingInfoCard } from "@/components/cart/TrackingInfoCard";
import type { OrderStatus } from "@/types";

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

const STATUS_DISPLAY: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-cairo-text/10 text-cairo-text/70" },
  in_process: { label: "En proceso", className: "bg-cairo-accent-yellow text-cairo-text" },
  paid: { label: "Pagado", className: "bg-cairo-accent-blue/40 text-cairo-text" },
  shipped: { label: "Enviado", className: "bg-purple-100 text-purple-800" },
  rejected: { label: "Rechazado", className: "bg-red-50 text-red-700" },
  cancelled: { label: "Cancelado", className: "bg-cairo-text/10 text-cairo-text/50" },
};

/**
 * Single order detail (Server Component). Redirects to `/auth/login` when
 * there is no active session; renders a 404 when the order does not exist
 * or does not belong to the current user (the two cases are deliberately
 * indistinguishable, see `getOrderWithItems`).
 */
export default async function OrderDetailPage(props: PageProps<"/mis-pedidos/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=/mis-pedidos/${id}`);
  }

  const result = await getOrderWithItems(id, user.id);

  if (!result) {
    notFound();
  }

  const { order, items } = result;
  const status = STATUS_DISPLAY[order.status];

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <Link href="/mis-pedidos" className="text-sm text-cairo-primary hover:underline">
        ← Volver a mis pedidos
      </Link>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-cairo-text">
            Pedido #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-2 text-sm text-cairo-text/60">
            Realizado el {DATE_FORMATTER.format(new Date(order.createdAt))}
          </p>
        </div>
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-6 rounded-lg border border-cairo-text/10 bg-cairo-bg p-6">
        <ul className="divide-y divide-cairo-text/10">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 py-4">
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-cairo-text/5">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff className="h-5 w-5 text-cairo-text/30" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <p className="text-sm text-cairo-text">{item.productName}</p>
                <p className="mt-0.5 text-sm text-cairo-text/50">
                  {item.quantity} x {PRICE_FORMATTER.format(item.unitPrice)}
                </p>
              </div>

              <p className="text-sm font-medium text-cairo-text">
                {PRICE_FORMATTER.format(item.subtotal)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-cairo-text/10 pt-4">
          <span className="text-sm font-medium text-cairo-text">Total</span>
          <span className="text-lg font-semibold text-cairo-text">
            {PRICE_FORMATTER.format(order.total)}
          </span>
        </div>

        <div className="mt-6 border-t border-cairo-text/10 pt-4 text-sm text-cairo-text/70">
          <p className="font-medium text-cairo-text">Dirección de envío</p>
          <p className="mt-1">
            {order.guestAddressStreet} {order.guestAddressNumber}
            {order.guestAddressFloorApt ? `, ${order.guestAddressFloorApt}` : ""}, {order.guestAddressCity},{" "}
            {order.guestAddressState}
          </p>
          <p>CP {order.guestAddressZip}</p>
        </div>

        {order.status === "shipped" && order.trackingNumber && order.shippingProvider && (
          <TrackingInfoCard
            trackingNumber={order.trackingNumber}
            shippingProvider={order.shippingProvider}
          />
        )}
      </div>
    </div>
  );
}
