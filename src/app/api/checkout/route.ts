import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateDiscountedPrice } from "@/lib/utils";
import { checkoutSchema, type CheckoutFormValues } from "@/lib/validation/checkoutSchema";

const mercadoPagoConfig = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

interface CheckoutItemInput {
  productId: string;
  quantity: number;
}

interface CheckoutRequestBody {
  items: CheckoutItemInput[];
  contact: CheckoutFormValues;
}

interface ProductPriceRow {
  id: string;
  name: string;
  price: number;
  stock: number;
  is_active: boolean;
  discount_percentage: number | null;
  is_discount_active: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function parseCheckoutItem(value: unknown): CheckoutItemInput {
  const record = asRecord(value);

  if (
    !record ||
    typeof record.productId !== "string" ||
    typeof record.quantity !== "number" ||
    !Number.isInteger(record.quantity) ||
    record.quantity <= 0
  ) {
    throw new Error("Each item needs a valid productId and a positive integer quantity.");
  }

  return { productId: record.productId, quantity: record.quantity };
}

/** Validates the raw request body into a well-formed `CheckoutRequestBody`, or throws. */
function parseCheckoutRequest(body: unknown): CheckoutRequestBody {
  const record = asRecord(body);
  if (!record) {
    throw new Error("Invalid request body.");
  }

  if (!Array.isArray(record.items) || record.items.length === 0) {
    throw new Error("Cart must contain at least one item.");
  }

  // Re-validate the contact/shipping fields server-side — the client-side
  // react-hook-form + zod check is a UX convenience only, never the
  // security boundary.
  const parsedContact = checkoutSchema.safeParse(record.contact);
  if (!parsedContact.success) {
    throw new Error("Invalid contact or shipping address information.");
  }

  return {
    items: record.items.map(parseCheckoutItem),
    contact: parsedContact.data,
  };
}

/**
 * Creates a PENDING order from the current cart.
 *
 * [CRITICAL] Prices are never trusted from the client. Every item's
 * `unit_price` is looked up fresh from `products` via the service-role
 * client (bypassing RLS) right before the total is computed, so a tampered
 * client payload can change quantities but can never change what gets
 * charged per unit. This includes discounts: `discount_percentage` and
 * `is_discount_active` are re-fetched from the database alongside the base
 * price, and the discount is (re-)applied here — the cart's own discounted
 * price is only a client-side preview.
 *
 * Runs as a Route Handler (not a Server Action) because it also needs to be
 * callable directly from a future Mercado Pago preference-creation step —
 * that step, and the eventual payment webhook, are intentionally out of
 * scope here; this endpoint only produces the PENDING order.
 */
export async function POST(request: Request) {
  let parsed: CheckoutRequestBody;

  try {
    const body: unknown = await request.json();
    parsed = parseCheckoutRequest(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request body.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // The cookie-aware client resolves the current session, if any — guest
  // checkout is allowed (schema.orders.user_id is nullable).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const service = createServiceClient();

  const productIds = parsed.items.map((item) => item.productId);

  const { data: products, error: productsError } = await service
    .from("products")
    .select("id, name, price, stock, is_active, discount_percentage, is_discount_active")
    .in("id", productIds)
    .returns<ProductPriceRow[]>();

  if (productsError) {
    return NextResponse.json({ error: "Failed to validate cart items." }, { status: 500 });
  }

  const productById = new Map((products ?? []).map((product) => [product.id, product]));

  const orderItems: {
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    subtotal: number;
  }[] = [];

  for (const item of parsed.items) {
    const product = productById.get(item.productId);

    if (!product || !product.is_active) {
      return NextResponse.json(
        { error: `Product "${item.productId}" is not available.` },
        { status: 400 },
      );
    }

    if (item.quantity > product.stock) {
      return NextResponse.json(
        { error: `Not enough stock for "${product.name}".` },
        { status: 400 },
      );
    }

    const unitPrice = calculateDiscountedPrice(
      product.price,
      product.discount_percentage,
      product.is_discount_active,
    );
    const subtotal = unitPrice * item.quantity;

    orderItems.push({
      product_id: product.id,
      product_name: product.name,
      unit_price: unitPrice,
      quantity: item.quantity,
      subtotal,
    });
  }

  const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

  const { contact } = parsed;

  const { data: order, error: orderError } = await service
    .from("orders")
    .insert({
      user_id: user?.id ?? null,
      status: "pending",
      total,
      guest_email: contact.guestEmail,
      guest_name: contact.guestName,
      guest_phone: contact.guestPhone,
      guest_dni: contact.guestDni,
      guest_address_street: contact.guestAddressStreet,
      guest_address_number: contact.guestAddressNumber,
      guest_address_floor_apt: contact.guestAddressFloorApt || null,
      guest_address_city: contact.guestAddressCity,
      guest_address_state: contact.guestAddressState,
      guest_address_zip: contact.guestAddressZip,
    })
    .select("id")
    .single<{ id: string }>();

  if (orderError || !order) {
    return NextResponse.json({ error: "Failed to create order." }, { status: 500 });
  }

  const { error: itemsError } = await service
    .from("order_items")
    .insert(orderItems.map((item) => ({ ...item, order_id: order.id })));

  if (itemsError) {
    // Avoid leaving a totals-less, item-less order behind.
    await service.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Failed to create order items." }, { status: 500 });
  }

  // Create the Mercado Pago Checkout Pro preference for this order. The
  // order's own id is attached as `external_reference` so the webhook can
  // map an incoming payment notification back to it.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  const preference = new Preference(mercadoPagoConfig);

  let initPoint: string;

  try {
    const preferenceResponse = await preference.create({
      body: {
        items: orderItems.map((item) => ({
          id: item.product_id,
          title: item.product_name,
          quantity: item.quantity,
          // Defensive coercion: guarantees a numeric `unit_price` even if the
          // value were ever to flow through as a string, since Mercado Pago
          // rejects the preference payload when it isn't a number.
          unit_price: Number(item.unit_price),
          currency_id: "ARS",
        })),
        // Pre-filling the payer's DNI speeds up the Checkout Pro flow and is
        // required by Mercado Pago to properly identify the payer in AR.
        payer: {
          name: contact.guestName,
          email: contact.guestEmail,
          identification: {
            type: "DNI",
            number: contact.guestDni,
          },
        },
        external_reference: order.id,
        back_urls: {
          success: `${siteUrl}/carrito/exito`,
          pending: `${siteUrl}/carrito/pendiente`,
          failure: `${siteUrl}/carrito/error`,
        },
        notification_url: `${siteUrl}/api/webhooks/mercadopago`,
      },
    });

    if (!preferenceResponse.init_point) {
      throw new Error("Mercado Pago did not return an init_point.");
    }

    initPoint = preferenceResponse.init_point;
  } catch (error) {
    // Log the exact rejection reason (e.g. a malformed price or a missing
    // title) so a bad payload can be debugged from the server logs.
    console.error("MP Error:", error);
    // Roll back the order so a failed preference does not leave a dangling
    // PENDING order with no way for the buyer to pay for it.
    await service.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Failed to create the payment preference." }, { status: 500 });
  }

  return NextResponse.json({ orderId: order.id, total, initPoint }, { status: 201 });
}
