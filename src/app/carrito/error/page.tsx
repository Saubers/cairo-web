import Link from "next/link";
import { XCircle } from "lucide-react";

/**
 * Mercado Pago redirects here when the payment is rejected or the user
 * cancels Checkout Pro. Deliberately does NOT look up the order or clear
 * the cart (unlike `/carrito/exito` and `/carrito/pendiente`): the order
 * created in `app/api/checkout/route.ts` stays in `pending` status and the
 * customer's cart items are kept in `localStorage` so they can retry
 * checkout immediately, from `/carrito`, without re-adding every item.
 */
export default function CheckoutErrorPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6 lg:px-8">
      <XCircle className="mx-auto h-12 w-12 text-red-600" />
      <h1 className="mt-4 font-heading text-3xl text-cairo-text">No pudimos procesar el pago</h1>
      <p className="mt-2 text-sm text-cairo-text/60">
        El pago fue rechazado o cancelado. Tus productos siguen en el carrito,
        podés intentar de nuevo cuando quieras.
      </p>

      <Link
        href="/carrito"
        className="mt-8 inline-block rounded-md bg-cairo-primary px-6 py-2 text-sm font-medium text-cairo-bg transition-opacity hover:opacity-90"
      >
        Volver al carrito
      </Link>
    </div>
  );
}
