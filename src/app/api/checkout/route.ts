import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateDiscountedPrice } from "@/lib/utils";
import { calculateShipping, FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_RATE } from "@/lib/shipping";
import { checkoutSchema, type CheckoutFormValues } from "@/lib/validation/checkoutSchema";

// Forces this route to always run per-request rather than being evaluated
// (or cached) at build time. Without this, a CLI-driven `next build` can
// statically analyze this handler and bake in whatever `process.env` looks
// like at build time instead of at request time — which is how the service
// key ends up missing in production despite being set correctly.
export const dynamic = "force-dynamic";

// [EDGE SAFETY] `MercadoPagoConfig` is NOT instantiated at module scope
// anymore. On Cloudflare's Workers runtime a throw during module
// evaluation (e.g. the env var below being unset at cold start) crashes the
// whole module before `POST` ever runs — Next.js has no JSON response to
// return at that point, so the client's `response.json()` sees an empty
// body and blows up with "Unexpected end of JSON input". Constructing it
// lazily, inside the handler's try/catch, turns that same failure into a
// normal, catchable error with a real JSON response instead.
function getMercadoPagoConfig(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN is not configured.");
  }

  return new MercadoPagoConfig({ accessToken });
}

interface CheckoutItemInput {
  productId: string;
  /** `null` for a product with no color variants, mirroring `CartItem.variantId`. */
  variantId: string | null;
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

/** Stock/ownership fields re-fetched fresh per variant, mirroring `ProductPriceRow`'s role for the parent product. */
interface VariantStockRow {
  id: string;
  product_id: string;
  color_name: string;
  stock: number;
}

interface StoreSettingsRow {
  free_shipping_threshold: number;
  flat_shipping_rate: number;
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

  if (record.variantId !== null && record.variantId !== undefined && typeof record.variantId !== "string") {
    throw new Error("Each item's variantId must be a string or null.");
  }

  return {
    productId: record.productId,
    variantId: typeof record.variantId === "string" ? record.variantId : null,
    quantity: record.quantity,
  };
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
 * Creates a PENDING order from the current cart and a Mercado Pago payment
 * preference for it.
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
 * [EDGE SAFETY] The actual logic lives in `handleCheckout` below, called
 * from inside this outer try/catch. Every *expected* failure (bad input,
 * out-of-stock items, a Supabase error field) already returns its own
 * `NextResponse.json(...)` from within `handleCheckout`, but this outer
 * boundary exists for the *unexpected* case — a thrown exception from the
 * Supabase client, the Mercado Pago SDK, or a missing env var — so the route
 * can never crash out without a body. On Cloudflare's edge runtime, an
 * uncaught throw turns into an empty/HTML error response, which is exactly
 * what made the frontend's `response.json()` fail with "Unexpected end of
 * JSON input" instead of surfacing a readable error.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    return await handleCheckout(request);
  } catch (error) {
    // Full detail goes to the server logs (visible in Cloudflare Pages'
    // function logs) — never swallowed silently.
    console.error("Unhandled error in /api/checkout:", error);

    const details = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: "Internal Server Error", details }, { status: 500 });
  }
}

async function handleCheckout(request: Request): Promise<NextResponse> {
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

  // Resolved once, into a local `const`, and passed explicitly into
  // `createServiceClient` below instead of letting that function read
  // `process.env` internally. This fails with a specific, greppable message
  // instead of letting the Supabase SDK's generic "supabaseKey is
  // required." reach the outer catch — the root cause (missing env var in
  // this runtime) is unambiguous in the Cloudflare Pages function logs.
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in Edge Runtime");
  }

  const service = createServiceClient(serviceRoleKey);

  const productIds = parsed.items.map((item) => item.productId);
  const variantIds = parsed.items.filter((item) => item.variantId !== null).map((item) => item.variantId as string);

  const [{ data: products, error: productsError }, { data: variants, error: variantsError }, { data: storeSettings }] =
    await Promise.all([
      service
        .from("products")
        .select("id, name, price, stock, is_active, discount_percentage, is_discount_active")
        .in("id", productIds)
        .returns<ProductPriceRow[]>(),
      // [CRITICAL] Variant stock, like the parent product's, is re-fetched
      // fresh here rather than trusted from the client's cart snapshot.
      variantIds.length > 0
        ? service
            .from("product_variants")
            .select("id, product_id, color_name, stock")
            .in("id", variantIds)
            .returns<VariantStockRow[]>()
        : Promise.resolve({ data: [] as VariantStockRow[], error: null }),
      // [CRITICAL] Shipping config is read fresh from `store_settings` here —
      // never trusted from the client — so an admin's edit on
      // `/admin/configuracion` takes effect on the very next checkout without
      // a deploy. Falls back to the hardcoded constants only if the row is
      // somehow missing.
      service.from("store_settings").select("free_shipping_threshold, flat_shipping_rate").limit(1).maybeSingle<StoreSettingsRow>(),
    ]);

  if (productsError || variantsError) {
    return NextResponse.json({ error: "Failed to validate cart items." }, { status: 500 });
  }

  const freeShippingThreshold = storeSettings
    ? Number(storeSettings.free_shipping_threshold)
    : FREE_SHIPPING_THRESHOLD;
  const flatShippingRate = storeSettings ? Number(storeSettings.flat_shipping_rate) : FLAT_SHIPPING_RATE;

  const productById = new Map((products ?? []).map((product) => [product.id, product]));
  const variantById = new Map((variants ?? []).map((variant) => [variant.id, variant]));

  const orderItems: {
    product_id: string;
    product_name: string;
    variant_id: string | null;
    color_name: string | null;
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

    // When the cart line carries a `variantId`, the variant's own `stock`
    // (not the parent product's) is the authoritative figure — the parent
    // product's `stock` is only meaningful for products with no variants.
    let variant: VariantStockRow | undefined;

    if (item.variantId !== null) {
      variant = variantById.get(item.variantId);

      if (!variant || variant.product_id !== item.productId) {
        return NextResponse.json(
          { error: `The selected color for "${product.name}" is not available.` },
          { status: 400 },
        );
      }

      if (item.quantity > variant.stock) {
        return NextResponse.json(
          { error: `Not enough stock for "${product.name}" (${variant.color_name}).` },
          { status: 400 },
        );
      }
    } else if (item.quantity > product.stock) {
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
      variant_id: variant?.id ?? null,
      color_name: variant?.color_name ?? null,
      unit_price: unitPrice,
      quantity: item.quantity,
      subtotal,
    });
  }

  // [CRITICAL] Shipping, like unit prices above, is never trusted from the
  // client: it's derived here from the server-recomputed `subtotal` and the
  // live `store_settings` row fetched above.
  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const shipping = calculateShipping(subtotal, freeShippingThreshold, flatShippingRate);
  const total = shipping.total;

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

  let initPoint: string;

  try {
    // Constructed inside this try block (not above it) so a missing/invalid
    // `MERCADOPAGO_ACCESS_TOKEN` is caught here too, triggering the same
    // order rollback as any other preference-creation failure below.
    const preference = new Preference(getMercadoPagoConfig());

    const preferenceResponse = await preference.create({
      body: {
        items: [
          ...orderItems.map((item) => ({
            id: item.product_id,
            title: item.product_name,
            quantity: item.quantity,
            // Defensive coercion: guarantees a numeric `unit_price` even if the
            // value were ever to flow through as a string, since Mercado Pago
            // rejects the preference payload when it isn't a number.
            unit_price: Number(item.unit_price),
            currency_id: "ARS",
          })),
          // Flat-rate shipping is charged as its own line item rather than via
          // `shipments.cost`, since it's broadly supported by Checkout Pro and
          // keeps the total Mercado Pago charges in sync with `orders.total`
          // without needing a separate shipments object. Omitted entirely once
          // the subtotal clears the free-shipping threshold.
          ...(shipping.isFree
            ? []
            : [
                {
                  id: "shipping",
                  title: "Envío a Domicilio",
                  quantity: 1,
                  unit_price: shipping.cost,
                  currency_id: "ARS",
                },
              ]),
        ],
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
