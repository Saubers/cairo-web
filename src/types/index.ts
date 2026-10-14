// -----------------------------------------------------------------------------
// Global domain types for Cairo.
// These mirror the tables and columns defined in docs/context/database-schema.md.
// Field names use camelCase here; mapping to/from the snake_case database
// columns happens in the data-access layer (src/lib/data/*.ts), not here.
// -----------------------------------------------------------------------------

/** Application role stored on `profiles.role`. Exactly two users may hold 'admin'. */
export type UserRole = "customer" | "admin";

/**
 * Lifecycle states for an order. `paid` is driven by the Mercado Pago
 * webhook; `shipped` is set manually by an admin once the order is
 * dispatched to a carrier.
 */
export type OrderStatus = "pending" | "in_process" | "paid" | "shipped" | "rejected" | "cancelled";

/** Mirrors the `public.profiles` table (1:1 extension of `auth.users`). */
export interface UserProfile {
  id: string;
  fullName: string | null;
  phone: string | null;
  role: UserRole;
  streetAddress: string | null;
  apartment: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors the `public.categories` table. */
export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

/** Mirrors the `public.collections` table (curated storefront groupings). */
export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors the `public.products` table. */
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  categoryId: string | null;
  collectionId: string | null;
  color: string | null;
  imageUrls: string[];
  isActive: boolean;
  /** Percentage (0-100), or `null` when no discount has ever been configured. */
  discountPercentage: number | null;
  /** Whether `discountPercentage` is currently applied to the product's price. */
  isDiscountActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mirrors the `public.orders` table.
 * The `guest*` fields are contact + shipping address info captured at
 * checkout time, for every order (guest or logged-in) — AR logistics/AFIP
 * require a DNI and full address regardless of account status.
 */
export interface Order {
  id: string;
  userId: string | null;
  status: OrderStatus;
  total: number;
  mpPreferenceId: string | null;
  mpPaymentId: string | null;
  guestEmail: string | null;
  guestName: string | null;
  guestPhone: string | null;
  guestDni: string | null;
  guestAddressStreet: string | null;
  guestAddressNumber: string | null;
  guestAddressFloorApt: string | null;
  guestAddressCity: string | null;
  guestAddressState: string | null;
  guestAddressZip: string | null;
  /** Set by an admin once `status` is `"shipped"`; `null` until then. */
  trackingNumber: string | null;
  /** Carrier name (e.g. "Correo Argentino", "Andreani"); `null` until shipped. */
  shippingProvider: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mirrors the `public.order_items` table.
 * `productName` and `unitPrice` are snapshots taken at purchase time and may
 * differ from the current `Product` record.
 */
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  createdAt: string;
}

/**
 * Client-side cart entry (Zustand store), not a database table.
 * Kept intentionally small/denormalized for fast rendering of the cart UI.
 */
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
}
