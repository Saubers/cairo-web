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
}

/** Lets an admin change an order's lifecycle status from its detail page. */
export function OrderStatusForm({ orderId, currentStatus }: OrderStatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await updateOrderStatus(orderId, status);

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
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
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
        disabled={isSubmitting || status === currentStatus}
        className="flex items-center gap-2 rounded-md bg-cairo-primary px-4 py-2 text-sm font-medium text-cairo-bg transition-all duration-200 ease-in-out hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Guardar
      </button>
    </form>
  );
}
