import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment, WebhookSignatureValidator } from "mercadopago";
import { createServiceClient } from "@/lib/supabase/service";
import { sendOrderConfirmationEmail } from "@/lib/email";

// Forces this route to always run per-request rather than being evaluated
// (or cached) at build time — same reasoning as `/api/checkout/route.ts`.
export const dynamic = "force-dynamic";

interface OrderRow {
  id: string;
  user_id: string | null;
  status: string;
  total: number;
  guest_email: string | null;
  guest_name: string | null;
}

interface OrderItemRow {
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

/** Minimal shape needed to decrement stock — distinct from `OrderItemRow`, which also carries display fields unused here. */
interface OrderItemStockRow {
  product_id: string;
  quantity: number;
}

interface ProfileRow {
  full_name: string | null;
}

/** The resolved recipient for an order's confirmation email, plus which path produced it (for logging). */
interface OrderRecipient {
  email: string;
  name: string | null;
  source: "registered" | "guest";
}

// [EDGE SAFETY] Constructed lazily inside the handler instead of at module
// scope — same reasoning as `getMercadoPagoConfig` in `/api/checkout/route.ts`.
// A throw during module evaluation (e.g. a missing env var at cold start) on
// Cloudflare's Workers runtime would crash the whole module before `POST`
// ever runs, leaving Mercado Pago with no valid HTTP response and triggering
// endless notification retries.
function getMercadoPagoConfig(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN is not configured.");
  }

  return new MercadoPagoConfig({ accessToken });
}

/**
 * Resolves who should receive the order confirmation email, covering both
 * checkout flows:
 * - Registered customer (`user_id` set): email comes from `auth.users`
 *   (via the service-role admin API — `profiles` has no email column), and
 *   the display name from `profiles.full_name`.
 * - Guest checkout (`user_id` is null): uses the `guest_email`/`guest_name`
 *   columns captured directly on `orders` at checkout time — there is no
 *   account to join against.
 *
 * Returns `null` only in the should-never-happen case where neither path
 * yields an email, so the caller can skip sending without throwing.
 */
async function resolveOrderRecipient(
  service: ReturnType<typeof createServiceClient>,
  order: OrderRow,
): Promise<OrderRecipient | null> {
  if (order.user_id) {
    const { data: userResult } = await service.auth.admin.getUserById(order.user_id);
    const email = userResult?.user?.email;
    if (!email) return null;

    const { data: profileRow } = await service
      .from("profiles")
      .select("full_name")
      .eq("id", order.user_id)
      .maybeSingle<ProfileRow>();

    return { email, name: profileRow?.full_name ?? null, source: "registered" };
  }

  if (order.guest_email) {
    return { email: order.guest_email, name: order.guest_name, source: "guest" };
  }

  return null;
}

/**
 * Decrements `products.stock` for every line item of a newly-paid order,
 * via the `decrement_product_stock` Postgres function (see
 * `supabase/migrations/20261015010000_add_decrement_product_stock_rpc.sql`).
 *
 * The RPC does the subtract-and-floor-at-zero atomically in a single
 * `UPDATE`, so concurrent webhook deliveries for different orders that
 * happen to share a product never lose a decrement to a read-then-write
 * race. Items with a null `product_id` (the referenced product was deleted
 * after the order was placed) are skipped — there is nothing left to
 * decrement.
 *
 * Must never throw: this runs after the order has already been marked
 * "paid", which must not be rolled back by an inventory bookkeeping
 * failure. Each failed decrement is logged for manual reconciliation.
 */
async function decrementStockForOrder(service: ReturnType<typeof createServiceClient>, orderId: string): Promise<void> {
  const { data: itemRows, error: itemsError } = await service
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId)
    .returns<OrderItemStockRow[]>();

  if (itemsError) {
    console.error(`[mercadopago-webhook] Failed to load order_items for stock decrement (order ${orderId}):`, itemsError);
    return;
  }

  for (const item of itemRows ?? []) {
    if (!item.product_id) continue;

    const { error: rpcError } = await service.rpc("decrement_product_stock", {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    });

    if (rpcError) {
      console.error(
        `[mercadopago-webhook] Failed to decrement stock for product ${item.product_id} (order ${orderId}):`,
        rpcError,
      );
    }
  }
}

/**
 * Looks up the order's recipient and line items, then sends the
 * confirmation email. Works uniformly for registered customers and guest
 * checkouts — see `resolveOrderRecipient`.
 */
async function notifyOrderPaid(
  service: ReturnType<typeof createServiceClient>,
  order: OrderRow,
): Promise<void> {
  const recipient = await resolveOrderRecipient(service, order);

  if (!recipient) {
    // Extremely unlikely: an order with neither a linked account nor
    // guest contact info. Log for investigation and return normally —
    // this must never throw, so the webhook still responds with HTTP 200
    // and Mercado Pago does not keep retrying an already-reconciled order.
    console.error(
      `[mercadopago-webhook] Order ${order.id} has no resolvable recipient (no user_id and no guest_email) — skipping confirmation email.`,
    );
    return;
  }

  console.log(
    `[mercadopago-webhook] Sending order confirmation email for order ${order.id} to ${recipient.source === "registered" ? "a registered user" : "a guest"} (${recipient.email}).`,
  );

  const { data: itemRows } = await service
    .from("order_items")
    .select("product_name, unit_price, quantity, subtotal")
    .eq("order_id", order.id)
    .returns<OrderItemRow[]>();

  await sendOrderConfirmationEmail(recipient.email, recipient.name, {
    orderId: order.id,
    total: order.total,
    items: (itemRows ?? []).map((row) => ({
      productName: row.product_name,
      unitPrice: row.unit_price,
      quantity: row.quantity,
      subtotal: row.subtotal,
    })),
  });
}

/**
 * Mercado Pago IPN/webhook endpoint.
 *
 * Verifies the `x-signature` header with the SDK's own validator before
 * trusting anything in the request, then — for approved "payment"
 * notifications — fetches the payment and marks the matching order as
 * `paid` via the service-role client (the only client allowed to write to
 * `orders`, per RLS).
 *
 * [EDGE SAFETY] The whole body runs inside an outer try/catch so an
 * unexpected throw (a missing env var, a Supabase/Mercado Pago SDK error)
 * never crashes the route without a response. Any failure here returns a
 * non-2xx status on purpose — Mercado Pago's own retry mechanism is the
 * expected recovery path for a transient failure (e.g. Supabase briefly
 * unreachable), whereas the inner `notifyOrderPaid` failure is deliberately
 * swallowed below since that email failure must never trigger a retry of
 * an already-successful order reconciliation.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);

  // Per the SDK's documented contract, `dataId` is sourced from the query
  // string `data.id` parameter, not the JSON body.
  const dataId = url.searchParams.get("data.id");

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET!,
      // [SECURITY] Rejects a signature whose `ts` is more than 5 minutes old,
      // narrowing the window in which a captured, still cryptographically
      // valid notification could be replayed. (The idempotency check below
      // already no-ops a replay against an order that's already "paid", and
      // payment status is always re-fetched live from Mercado Pago rather
      // than trusted from the notification body — this is defense in depth,
      // not the only safeguard.)
      toleranceSeconds: 300,
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  try {
    const body: unknown = await request.json().catch(() => null);
    const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
    const notificationType = record?.type;

    if (notificationType !== "payment" || !dataId) {
      // Not a payment notification (or missing id) — acknowledge and ignore.
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Constructed inside this try block (not at module scope) so a
    // missing/invalid `MERCADOPAGO_ACCESS_TOKEN` surfaces as a catchable
    // error here instead of crashing the whole module on cold start.
    const payment = new Payment(getMercadoPagoConfig());
    const paymentResponse = await payment.get({ id: dataId });

    if (paymentResponse.status === "approved" && paymentResponse.external_reference) {
      // Resolved explicitly into a local `const` and validated before use —
      // same pattern as `/api/checkout/route.ts` — so a missing service-role
      // key fails with an unambiguous message in the server logs instead of
      // the SDK's generic "supabaseKey is required." error.
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!serviceRoleKey) {
        throw new Error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in Edge Runtime");
      }

      const service = createServiceClient(serviceRoleKey);
      const orderId = paymentResponse.external_reference;

      const { data: existingOrder } = await service
        .from("orders")
        .select("id, user_id, status, total, guest_email, guest_name")
        .eq("id", orderId)
        .maybeSingle<OrderRow>();

      // Mercado Pago may redeliver the same notification. Re-processing an
      // already-paid order would re-send the confirmation email, so this acts
      // as the idempotency guard (see docs/context/tech-stack.md §3.5).
      if (!existingOrder || existingOrder.status === "paid") {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      await service
        .from("orders")
        .update({
          status: "paid",
          mp_payment_id: String(paymentResponse.id),
        })
        .eq("id", orderId);

      // Inventory deduction happens right after the order is confirmed
      // "paid" — see `decrementStockForOrder`'s docstring for why this must
      // never throw or roll back the status update above.
      await decrementStockForOrder(service, orderId);

      // A failure sending the confirmation email must never surface as a
      // webhook error — Mercado Pago retries non-2xx responses, which would
      // needlessly re-run the (already-successful) order reconciliation above.
      try {
        await notifyOrderPaid(service, existingOrder);
      } catch (emailError) {
        console.error("Failed to send order confirmation email:", emailError);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    // Full detail goes to the server logs (visible in Cloudflare Pages'
    // function logs). The non-2xx status is intentional — it tells Mercado
    // Pago to retry this notification instead of treating it as reconciled.
    console.error("Unhandled error in /api/webhooks/mercadopago:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
