import Link from "next/link";
import { Clock } from "lucide-react";
import { readStringParam } from "@/lib/searchParams";
import { getOrderConfirmation } from "@/services/orderService";
import { OrderSummaryCard } from "@/components/cart/OrderSummaryCard";
import { ClearCartOnMount } from "@/components/cart/ClearCartOnMount";

/**
 * Mercado Pago redirects here for payment methods that don't settle
 * immediately (e.g. cash payments like Rapipago/Pago Fácil, or a bank
 * transfer awaiting confirmation). The order already exists (created before
 * the Mercado Pago redirect) and its final status will be set by the
 * webhook once the payment clears — this page only acknowledges that the
 * order was placed, it does not claim payment succeeded.
 */
export default async function CheckoutPendingPage(props: PageProps<"/carrito/pendiente">) {
  const searchParams = await props.searchParams;
  const orderId = readStringParam(searchParams, "external_reference");

  const result = orderId ? await getOrderConfirmation(orderId) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
      {result && <ClearCartOnMount />}

      <Clock className="mx-auto h-12 w-12 text-cairo-accent-yellow" />
      <h1 className="mt-4 font-heading text-3xl text-cairo-text">Pago pendiente</h1>
      <p className="mt-2 text-sm text-cairo-text/60">
        Tu pedido fue registrado y está esperando la confirmación del pago.
        Te avisaremos por email en cuanto se acredite.
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
        Volver al inicio
      </Link>
    </div>
  );
}
