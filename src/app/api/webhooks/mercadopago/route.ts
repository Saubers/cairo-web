import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment, WebhookSignatureValidator } from "mercadopago";
import { createServiceClient } from "@/lib/supabase/service";
import { sendOrderConfirmationEmail } from "@/lib/email";

interface OrderRow {
  id: string;
  user_id: string | null;
  status: string;
  total: number;
}

interface OrderItemRow {
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

const mercadoPagoConfig = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

/**
 * Looks up the paying customer's email and the order's line items, then
 * sends the confirmation email. Guest orders (no `user_id`) have no
 * resolvable email anywhere in the schema, so they are silently skipped.
 */
async function notifyOrderPaid(
  service: ReturnType<typeof createServiceClient>,
  order: OrderRow,
): Promise<void> {
  if (!order.user_id) return;

  const { data: userResult } = await service.auth.admin.getUserById(order.user_id);
  const email = userResult?.user?.email;
  if (!email) return;

  const { data: itemRows } = await service
    .from("order_items")
    .select("product_name, unit_price, quantity, subtotal")
    .eq("order_id", order.id)
    .returns<OrderItemRow[]>();

  await sendOrderConfirmationEmail(email, {
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
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
  const notificationType = record?.type;

  if (notificationType !== "payment" || !dataId) {
    // Not a payment notification (or missing id) — acknowledge and ignore.
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const payment = new Payment(mercadoPagoConfig);
  const paymentResponse = await payment.get({ id: dataId });

  if (paymentResponse.status === "approved" && paymentResponse.external_reference) {
    const service = createServiceClient();
    const orderId = paymentResponse.external_reference;

    const { data: existingOrder } = await service
      .from("orders")
      .select("id, user_id, status, total")
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
}
