import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { Order } from "@/types";
import type { OrderItemWithImage } from "@/services/orderService";
import { TrackingInfoCard } from "@/components/cart/TrackingInfoCard";

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/**
 * Line items + total + shipping address for a single order. Shared by the
 * three post-checkout confirmation pages (`/carrito/exito`, `/pendiente`,
 * `/error`), which all render the same order snapshot regardless of the
 * payment outcome.
 */
export function OrderSummaryCard({
  order,
  items,
}: {
  order: Order;
  items: OrderItemWithImage[];
}) {
  return (
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
  );
}
