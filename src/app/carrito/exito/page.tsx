import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { readStringParam } from "@/lib/searchParams";
import { getOrderConfirmation } from "@/services/orderService";
import { OrderSummaryCard } from "@/components/cart/OrderSummaryCard";
import { ClearCartOnMount } from "@/components/cart/ClearCartOnMount";

/**
 * Mercado Pago's Checkout Pro redirects here on a successful payment,
 * appending `external_reference` (the order's own `id`, set at preference
 * creation time in `app/api/checkout/route.ts`) as a query param. See
 * `getOrderConfirmation` for why resolving the order from this id alone,
 * with no session check, is safe.
 *
 * The order's `status` here reflects the state at page-render time — the
 * webhook (the only source of truth for payment confirmation) may still be
 * in flight, so this page shows a success message based on the redirect
 * itself, not on `order.status === "paid"`.
 */
export default async function CheckoutSuccessPage(props: PageProps<"/carrito/exito">) {
  const searchParams = await props.searchParams;
  const orderId = readStringParam(searchParams, "external_reference");

  const result = orderId ? await getOrderConfirmation(orderId) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
      {result && <ClearCartOnMount />}

      <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
      <h1 className="mt-4 font-heading text-3xl text-cairo-text">¡Pago confirmado!</h1>
      <p className="mt-2 text-sm text-cairo-text/60">
        Gracias por tu compra. Te enviamos un email con los detalles del pedido.
      </p>

      {result && (
        <div className="text-left">
          <OrderSummaryCard order={result.order} items={result.items} />
        </div>
      )}

      <Link
        href="/"
        className="mt-8 inline-block rounded-md bg-cairo-primary px-6 py-2 text-sm font-medium text-cairo-bg transition-opacity hover:opacity-90"
      >
        Seguir comprando
      </Link>
    </div>
  );
}
