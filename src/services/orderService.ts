import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Order, OrderItem } from "@/types";

/** An `OrderItem` augmented with its product's first thumbnail, when resolvable. */
export interface OrderItemWithImage extends OrderItem {
  imageUrl: string | null;
}

/** An `Order` augmented with the placing customer's email, for the admin list view. */
export interface AdminOrderListItem extends Order {
  customerEmail: string | null;
}

/**
 * Full admin view of a single order: items (with images). Contact info and
 * shipping address are read directly off `order` (the `guest*` fields,
 * always populated at checkout time) — no separate profile lookup needed.
 */
export interface AdminOrderDetail {
  order: Order;
  items: OrderItemWithImage[];
}

/** Raw shape returned by Supabase for the `orders` table (snake_case columns). */
interface OrderRow {
  id: string;
  user_id: string | null;
  status: Order["status"];
  total: number;
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  guest_email: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_dni: string | null;
  guest_address_street: string | null;
  guest_address_number: string | null;
  guest_address_floor_apt: string | null;
  guest_address_city: string | null;
  guest_address_state: string | null;
  guest_address_zip: string | null;
  created_at: string;
  updated_at: string;
}

/** Raw shape returned by Supabase for the `order_items` table (snake_case columns). */
interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  created_at: string;
}

const ORDER_COLUMNS =
  "id, user_id, status, total, mp_preference_id, mp_payment_id, guest_email, guest_name, " +
  "guest_phone, guest_dni, guest_address_street, guest_address_number, guest_address_floor_apt, " +
  "guest_address_city, guest_address_state, guest_address_zip, created_at, updated_at";

const ORDER_ITEM_COLUMNS =
  "id, order_id, product_id, product_name, unit_price, quantity, subtotal, created_at";

function mapRowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    total: row.total,
    mpPreferenceId: row.mp_preference_id,
    mpPaymentId: row.mp_payment_id,
    guestEmail: row.guest_email,
    guestName: row.guest_name,
    guestPhone: row.guest_phone,
    guestDni: row.guest_dni,
    guestAddressStreet: row.guest_address_street,
    guestAddressNumber: row.guest_address_number,
    guestAddressFloorApt: row.guest_address_floor_apt,
    guestAddressCity: row.guest_address_city,
    guestAddressState: row.guest_address_state,
    guestAddressZip: row.guest_address_zip,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    unitPrice: row.unit_price,
    quantity: row.quantity,
    subtotal: row.subtotal,
    createdAt: row.created_at,
  };
}

/**
 * Fetches every order placed by the given user, most recent first.
 *
 * Reads go through the anon key; `orders_select_own_or_admin` RLS already
 * scopes rows to `auth.uid() = user_id` (or admins), so the explicit
 * `.eq("user_id", userId)` here is defense-in-depth, not the only guard.
 */
export async function getOrdersByUserId(userId: string): Promise<Order[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<OrderRow[]>();

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  return (data ?? []).map(mapRowToOrder);
}

/**
 * Fetches a single order (scoped to `userId`) together with its line items.
 * Returns `null` when the order does not exist or does not belong to this
 * user — RLS makes the two cases indistinguishable from a plain `select`,
 * which is the correct behavior here (never reveal whether an order id
 * belonging to someone else exists).
 */
export async function getOrderWithItems(
  orderId: string,
  userId: string,
): Promise<{ order: Order; items: OrderItemWithImage[] } | null> {
  const supabase = await createClient();

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle<OrderRow>();

  if (orderError) {
    throw new Error(`Failed to fetch order "${orderId}": ${orderError.message}`);
  }

  if (!orderRow) {
    return null;
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from("order_items")
    .select(ORDER_ITEM_COLUMNS)
    .eq("order_id", orderId)
    .returns<OrderItemRow[]>();

  if (itemsError) {
    throw new Error(`Failed to fetch items for order "${orderId}": ${itemsError.message}`);
  }

  const items = (itemRows ?? []).map(mapRowToOrderItem);
  const itemsWithImages = await attachItemImages(supabase, items);

  return {
    order: mapRowToOrder(orderRow),
    items: itemsWithImages,
  };
}

/**
 * Batch-resolves each item's product thumbnail (first entry of `image_urls`).
 *
 * Uses a single `.in("id", ...)` lookup rather than one query per item.
 * A `null` result (missing/discontinued product, or an inactive product
 * hidden from this non-admin user by `products_public_read` RLS) is a
 * normal, expected case — callers render a placeholder instead of erroring.
 */
async function attachItemImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  items: OrderItem[],
): Promise<OrderItemWithImage[]> {
  const productIds = [...new Set(items.map((item) => item.productId).filter(Boolean))] as string[];

  if (productIds.length === 0) {
    return items.map((item) => ({ ...item, imageUrl: null }));
  }

  const { data: productRows, error } = await supabase
    .from("products")
    .select("id, image_urls")
    .in("id", productIds)
    .returns<{ id: string; image_urls: string[] }[]>();

  if (error) {
    throw new Error(`Failed to fetch product images: ${error.message}`);
  }

  const imageByProductId = new Map((productRows ?? []).map((row) => [row.id, row.image_urls[0] ?? null]));

  return items.map((item) => ({
    ...item,
    imageUrl: item.productId ? imageByProductId.get(item.productId) ?? null : null,
  }));
}

/**
 * Batch-resolves the `auth.users` email for each given user id.
 *
 * `profiles` has no `email` column (it only extends `auth.users`), so this
 * is the only way to show "Email del cliente" in the admin UI. Requires the
 * service-role client, since the anon/authenticated key has no access to
 * `auth.users` — this never runs on the client (`server-only` is enforced
 * by `createServiceClient`'s own import).
 */
async function resolveCustomerEmails(userIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(userIds)];
  const emailById = new Map<string, string>();

  if (uniqueIds.length === 0) {
    return emailById;
  }

  const service = createServiceClient();

  await Promise.all(
    uniqueIds.map(async (userId) => {
      const { data } = await service.auth.admin.getUserById(userId);
      if (data?.user?.email) {
        emailById.set(userId, data.user.email);
      }
    }),
  );

  return emailById;
}

/**
 * Fetches the most recent orders for the admin "Pedidos" list, newest first.
 *
 * Capped at `limit` (default 50) so the view stays fast regardless of how
 * many orders the store accumulates over time — admins needing older
 * history can be given a dedicated search/pagination UI later.
 */
export async function getOrdersForAdmin(limit = 50): Promise<AdminOrderListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<OrderRow[]>();

  if (error) {
    throw new Error(`Failed to fetch orders for admin: ${error.message}`);
  }

  const orders = (data ?? []).map(mapRowToOrder);
  const userIds = orders.map((order) => order.userId).filter((id): id is string => id !== null);
  const emailById = await resolveCustomerEmails(userIds);

  return orders.map((order) => ({
    ...order,
    customerEmail: order.userId ? emailById.get(order.userId) ?? null : null,
  }));
}

/**
 * Fetches a single order for the admin detail view, with no `userId` scope
 * (admins may view any order — enforced by the `orders_select_own_or_admin`
 * RLS policy) together with its items/images. Contact info and shipping
 * address come straight off `order.guest*` — always populated at checkout
 * time, regardless of whether the buyer had an account.
 */
export async function getOrderForAdmin(orderId: string): Promise<AdminOrderDetail | null> {
  const supabase = await createClient();

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", orderId)
    .maybeSingle<OrderRow>();

  if (orderError) {
    throw new Error(`Failed to fetch order "${orderId}": ${orderError.message}`);
  }

  if (!orderRow) {
    return null;
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from("order_items")
    .select(ORDER_ITEM_COLUMNS)
    .eq("order_id", orderId)
    .returns<OrderItemRow[]>();

  if (itemsError) {
    throw new Error(`Failed to fetch items for order "${orderId}": ${itemsError.message}`);
  }

  const order = mapRowToOrder(orderRow);
  const items = await attachItemImages(supabase, (itemRows ?? []).map(mapRowToOrderItem));

  return { order, items };
}
