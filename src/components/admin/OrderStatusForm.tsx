"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateOrderStatus } from "@/app/admin/orders/actions";
import { ORDER_STATUS_OPTIONS } from "@/lib/orderStatus";
import type { OrderStatus } from "@/types";

interface OrderStatusFormProps {
  orderId: string;
  currentStatus: OrderStatus;
  currentTrackingNumber: string | null;
  currentShippingProvider: string | null;
}

/**
 * Lets an admin change an order's lifecycle status from its detail page.
 * Selecting "Enviado" reveals two extra inputs (carrier + tracking number),
 * both required before the form can be submitted in that state.
 */
export function OrderStatusForm({
  orderId,
  currentStatus,
  currentTrackingNumber,
  currentShippingProvider,
}: OrderStatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber ?? "");
  const [shippingProvider, setShippingProvider] = useState(currentShippingProvider ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isShipped = status === "shipped";
  const hasMissingShippingInfo = isShipped && (!trackingNumber.trim() || !shippingProvider.trim());
  const isUnchanged =
    status === currentStatus &&
    trackingNumber === (currentTrackingNumber ?? "") &&
    shippingProvider === (currentShippingProvider ?? "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await updateOrderStatus({
      orderId,
      status,
      trackingNumber: isShipped ? trackingNumber.trim() : undefined,
      shippingProvider: isShipped ? shippingProvider.trim() : undefined,
    });

    if (result.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    toast.success("Estado del pedido actualizado.");
    setIsSubmitting(false);
    // Re-fetch the Server Component tree so `currentStatus` reflects the
    // new value (keeps the "Guardar" button correctly disabled again).
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as OrderStatus)}
          className="flex-1 rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none transition-all duration-200 ease-in-out focus:border-cairo-primary"
        >
          {ORDER_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={isSubmitting || isUnchanged || hasMissingShippingInfo}
          className="flex items-center gap-2 rounded-md bg-cairo-primary px-4 py-2 text-sm font-medium text-cairo-bg transition-all duration-200 ease-in-out hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar
        </button>
      </div>

      {isShipped && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-cairo-text/60">Empresa de envío</label>
            <input
              type="text"
              value={shippingProvider}
              onChange={(event) => setShippingProvider(event.target.value)}
              placeholder="Ej: Correo Argentino"
              className="mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none transition-all duration-200 ease-in-out focus:border-cairo-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-cairo-text/60">Número de seguimiento</label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="Ej: AR123456789"
              className="mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none transition-all duration-200 ease-in-out focus:border-cairo-primary"
            />
          </div>
        </div>
      )}
    </form>
  );
}
