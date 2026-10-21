import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { endOfDayIso } from "@/lib/utils";
import type { Product, ProductVariant } from "@/types";

/** Sort options for the public catalog grid, driven by the `?sort=` URL search param. */
export type ProductSortOption = "newest" | "price_asc" | "price_desc";

export interface ProductFilters {
  categorySlug?: string;
  /** Matches products whose `color` is any of the given values (OR semantics). */
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  /** Case-insensitive substring match against `name`. */
  searchQuery?: string;
  /** 1-based page number. Defaults to 1. */
  page?: number;
  /** Scopes results to a single collection (e.g. for `/colecciones/[slug]`). */
  collectionId?: string;
  /** Defaults to `"newest"` (`created_at` descending). */
  sort?: ProductSortOption;
}

export interface AdminProductFilters {
  searchQuery?: string;
  /** 1-based page number. Defaults to 1. */
  page?: number;
  /** Inclusive lower bound (`YYYY-MM-DD`) on `created_at`. */
  startDate?: string;
  /** Inclusive upper bound (`YYYY-MM-DD`) on `created_at`. */
  endDate?: string;
}

/** Maps a `ProductSortOption` to the Supabase `.order()` call it represents. */
function resolveSortOrder(sort?: ProductSortOption): { column: "created_at" | "price"; ascending: boolean } {
  switch (sort) {
    case "price_asc":
      return { column: "price", ascending: true };
    case "price_desc":
      return { column: "price", ascending: false };
    default:
      return { column: "created_at", ascending: false };
  }
}

/** A page of products, plus enough information to render pagination controls. */
export interface PaginatedProducts {
  data: Product[];
  totalCount: number;
  totalPages: number;
}

/** Minimal product shape used by the collection product picker (no pagination, no pricing/stock fields). */
export interface ProductPickerItem {
  id: string;
  name: string;
  imageUrl: string | null;
  collectionId: string | null;
}

/** Default page size for the public storefront catalog. */
const PUBLIC_PAGE_SIZE = 12;
/** Default page size for the admin product list. */
const ADMIN_PAGE_SIZE = 20;

/** Converts a 1-based page number + page size into a Supabase `.range(from, to)` pair. */
function toRange(page: number, pageSize: number): [number, number] {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  return [from, from + pageSize - 1];
}

/** Raw shape returned by Supabase for the `products` table (snake_case columns). */
interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  category_id: string | null;
  collection_id: string | null;
  color: string | null;
  image_urls: string[];
  is_active: boolean;
  discount_percentage: number | null;
  is_discount_active: boolean;
  created_at: string;
  updated_at: string;
}

const PRODUCT_COLUMNS =
  "id, name, slug, description, price, stock, category_id, collection_id, color, image_urls, is_active, discount_percentage, is_discount_active, created_at, updated_at";

/** Raw shape returned by Supabase for the `product_variants` table (snake_case columns). */
interface ProductVariantRow {
  id: string;
  product_id: string;
  color_name: string;
  color_hex: string | null;
  images: string[];
  stock: number;
  created_at: string;
  updated_at: string;
}

const PRODUCT_VARIANT_COLUMNS = "id, product_id, color_name, color_hex, images, stock, created_at, updated_at";

/**
 * Defensive mapping: `images` must always come out as an array, even if a
 * stale row (e.g. one written before the `images text[]` migration
 * backfilled it, or returned by a client still on a cached schema) comes
 * back as `null`/`undefined` from Supabase. Letting `undefined` through
 * here is what causes a PDP Server Component crash downstream (e.g.
 * `variant.images[0]`), which surfaces to the browser as an opaque
 * "Minified React error #441".
 */
function mapRowToProductVariant(row: ProductVariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    colorName: row.color_name,
    colorHex: row.color_hex ?? null,
    images: Array.isArray(row.images) ? row.images : [],
    stock: row.stock ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetches every color variant for a product, ordered by creation so the
 * admin form and the PDP's swatch list render in the order they were added.
 * Governed by `product_variants_public_read` (see
 * docs/context/database-schema.md §5.4) — never trusted as a security
 * boundary on its own.
 */
async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_variants")
    .select(PRODUCT_VARIANT_COLUMNS)
    .eq("product_id", productId)
    .order("created_at", { ascending: true })
    .returns<ProductVariantRow[]>();

  if (error) {
    throw new Error(`Failed to fetch variants for product "${productId}": ${error.message}`);
  }

  return (data ?? []).map(mapRowToProductVariant);
}

/**
 * Bulk-fetches every variant for a batch of products in a single query,
 * grouped by `product_id`. Used by `getProducts` so the catalog grid can
 * evaluate stock-aware display (`getAvailableDisplayVariant`/
 * `getTotalStock` in `@/lib/productStock`) for an entire page of products
 * without firing one query per card.
 *
 * Uses the plain anon-key client (not the cookie-bound one) since every
 * caller of this helper is itself wrapped in `unstable_cache` (see
 * `fetchProducts` and `fetchActiveProductById` below), which forbids
 * reading cookies — and `product_variants_public_read` never depends on
 * the caller's session anyway.
 */
async function getVariantsByProductId(productIds: string[]): Promise<Map<string, ProductVariant[]>> {
  if (productIds.length === 0) return new Map();

  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("product_variants")
    .select(PRODUCT_VARIANT_COLUMNS)
    .in("product_id", productIds)
    .order("created_at", { ascending: true })
    .returns<ProductVariantRow[]>();

  if (error) {
    throw new Error(`Failed to fetch variants for ${productIds.length} product(s): ${error.message}`);
  }

  const variantsByProductId = new Map<string, ProductVariant[]>();
  for (const row of data ?? []) {
    const variant = mapRowToProductVariant(row);
    const existing = variantsByProductId.get(variant.productId);
    if (existing) {
      existing.push(variant);
    } else {
      variantsByProductId.set(variant.productId, [variant]);
    }
  }

  return variantsByProductId;
}

/**
 * Maps a raw `products` row to the `Product` domain type. `variants`
 * defaults to an empty array for callers that don't need it (CSV export,
 * collection picker, admin list) — `getProductById` and `getProducts` are
 * the two places that fetch and pass real variant rows through.
 */
function mapRowToProduct(row: ProductRow, variants: ProductVariant[] = []): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    stock: row.stock,
    categoryId: row.category_id,
    collectionId: row.collection_id,
    color: row.color,
    imageUrls: row.image_urls,
    isActive: row.is_active,
    discountPercentage: row.discount_percentage,
    isDiscountActive: row.is_discount_active,
    variants,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetches a page of active products from Supabase, dynamically scoped by
 * category, color, price range, and/or a text search against `name`. Each
 * filter is optional and chained only when provided, so callers can pass
 * any subset (e.g. just `minPrice`).
 *
 * Cached for an hour per unique filter combination — this is the
 * highest-traffic read in the app (backs the Home, `/catalogo`, and
 * `/colecciones/[slug]` grids), previously hitting Supabase on every
 * single request. `filters` is captured via closure rather than passed to
 * the cached function directly, so it's included explicitly in the cache
 * key (`JSON.stringify(filters)`) — required by `unstable_cache` for any
 * closed-over value. Admin mutations in `app/admin/products/actions.ts`
 * and `app/admin/collections/actions.ts` call `updateTag("products")` to
 * bust this immediately after a create/update/delete.
 */
export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedProducts> {
  return unstable_cache(() => fetchProducts(filters), ["products", JSON.stringify(filters)], {
    revalidate: 3600,
    tags: ["products"],
  })();
}

/**
 * Uncached implementation behind the `getProducts` cache wrapper above.
 * Reads go through the plain anon-key client (not the cookie-bound one —
 * forbidden inside `unstable_cache`) and are entirely governed by RLS
 * (public read access to active products, see
 * docs/context/database-schema.md). When a `categorySlug` is given but
 * does not match any category, an empty page is returned instead of
 * silently falling back to all products.
 */
async function fetchProducts(filters: ProductFilters): Promise<PaginatedProducts> {
  const supabase = createPublicClient();

  let categoryId: string | null = null;

  if (filters.categorySlug) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.categorySlug)
      .maybeSingle();

    if (categoryError) {
      throw new Error(`Failed to resolve category "${filters.categorySlug}": ${categoryError.message}`);
    }

    if (!category) {
      return { data: [], totalCount: 0, totalPages: 1 };
    }

    categoryId = category.id;
  }

  const [from, to] = toRange(filters.page ?? 1, PUBLIC_PAGE_SIZE);
  const sortOrder = resolveSortOrder(filters.sort);

  let query = supabase
    .from("products")
    .select(PRODUCT_COLUMNS, { count: "exact" })
    .eq("is_active", true)
    .order(sortOrder.column, { ascending: sortOrder.ascending })
    .range(from, to);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (filters.collectionId) {
    query = query.eq("collection_id", filters.collectionId);
  }

  if (filters.colors && filters.colors.length > 0) {
    query = query.in("color", filters.colors);
  }

  if (filters.minPrice !== undefined) {
    query = query.gte("price", filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    query = query.lte("price", filters.maxPrice);
  }

  if (filters.searchQuery) {
    query = query.ilike("name", `%${filters.searchQuery}%`);
  }

  // Wrapped in try/catch because a stale `page` combined with a filter that
  // now matches fewer rows pushes `.range(from, to)` past the end of the
  // result set, which Supabase/PostgREST rejects with HTTP 416 ("Requested
  // range not satisfiable") — either as a returned `error` or a thrown
  // exception, depending on the client/transport. Both cases are treated as
  // "no results for this page" instead of crashing the whole SSR render.
  try {
    const { data, error, count } = await query.returns<ProductRow[]>();

    if (error) {
      if (isRangeNotSatisfiableError(error.code, error.message)) {
        return { data: [], totalCount: 0, totalPages: 1 };
      }

      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    const rows = data ?? [];
    const totalCount = count ?? 0;

    // Fetched separately, in bulk for the whole page (one query, not one
    // per product), so the catalog grid can pick a color with stock and
    // sort out-of-stock products last (see `@/lib/productStock`). A
    // failure here degrades to "no variants for this page" rather than
    // failing the whole catalog fetch — variants are secondary to the
    // products themselves.
    let variantsByProductId = new Map<string, ProductVariant[]>();
    try {
      variantsByProductId = await getVariantsByProductId(rows.map((row) => row.id));
    } catch (variantsError) {
      console.error("[productService] Failed to fetch variants for the catalog page:", variantsError);
    }

    return {
      data: rows.map((row) => mapRowToProduct(row, variantsByProductId.get(row.id) ?? [])),
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / PUBLIC_PAGE_SIZE)),
    };
  } catch (caughtError) {
    if (caughtError instanceof Error && isRangeNotSatisfiableError(undefined, caughtError.message)) {
      return { data: [], totalCount: 0, totalPages: 1 };
    }

    throw caughtError;
  }
}

/** PostgREST's error code for "Requested range not satisfiable" (HTTP 416). */
const RANGE_NOT_SATISFIABLE_CODE = "PGRST103";

/** True when a Supabase/PostgREST error represents an out-of-range `.range()` request. */
function isRangeNotSatisfiableError(code: string | undefined, message: string): boolean {
  return code === RANGE_NOT_SATISFIABLE_CODE || message.includes("Requested range not satisfiable");
}

/**
 * Distinct, sorted list of colors currently in use by active products.
 * Used to populate the color filter UI. PostgREST has no `DISTINCT`
 * operator, so deduplication happens in memory on the (small) result set.
 */
async function fetchAvailableColors(): Promise<string[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("products")
    .select("color")
    .eq("is_active", true)
    .not("color", "is", null)
    .returns<Pick<ProductRow, "color">[]>();

  if (error) {
    throw new Error(`Failed to fetch available colors: ${error.message}`);
  }

  const colors = (data ?? [])
    .map((row) => row.color)
    .filter((color): color is string => color !== null);

  return Array.from(new Set(colors)).sort();
}

/** Cached for an hour — see `fetchProducts` above for why a plain client is required here. */
export const getAvailableColors = unstable_cache(fetchAvailableColors, ["available-colors"], {
  revalidate: 3600,
  tags: ["products"],
});

/**
 * Fetches a single product by id, regardless of `is_active`, for the admin
 * edit form. Returns `null` when no row matches.
 *
 * Admin-only by convention: uses the cookie-bound client so an
 * authenticated admin session can see inactive products too (see note
 * below), which also means this function can never be wrapped in
 * `unstable_cache` (cookies aren't readable inside a cached function). The
 * storefront product detail page uses `getActiveProductById` instead.
 *
 * Note: under RLS, `products_public_read` only exposes inactive products to
 * admins (`is_admin()`). Until real Supabase Auth + role wiring lands (see
 * src/app/admin/layout.tsx), this will only return inactive products once an
 * authenticated admin session exists.
 */
export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", id)
    .maybeSingle<ProductRow>();

  if (error) {
    throw new Error(`Failed to fetch product "${id}": ${error.message}`);
  }

  if (!data) return null;

  // Variants are a secondary, purely additive dataset layered on top of the
  // product's own base color/stock/images. If fetching them fails (schema
  // mismatch, transient Supabase error, etc.), the product itself is still
  // valid and renders fine with its base color — so the failure is logged
  // and swallowed here instead of propagating up and crashing the admin form.
  let variants: ProductVariant[] = [];
  try {
    variants = await getProductVariants(id);
  } catch (variantsError) {
    console.error(`[productService] Failed to fetch variants for product "${id}":`, variantsError);
  }

  return mapRowToProduct(data, variants);
}

/**
 * Cached, public-only counterpart to `getProductById` — used by the
 * storefront product detail page instead. Explicitly filters
 * `is_active = true` in the query itself (rather than relying on RLS to
 * tell admins and shoppers apart), so the result is always identical
 * regardless of who's viewing. That's a deliberate trade-off: an admin can
 * no longer preview a draft/inactive product through the public PDP URL
 * (use the admin edit form for that), but the read can now be served from
 * Next.js' Data Cache instead of hitting Supabase on every page visit.
 * Tagged both `"products"` (busted by any catalog-wide write) and
 * `product-${id}` (busted surgically by `updateProduct`/`deleteProduct`
 * for this one id).
 */
export async function getActiveProductById(id: string): Promise<Product | null> {
  return unstable_cache(() => fetchActiveProductById(id), ["active-product", id], {
    revalidate: 3600,
    tags: ["products", `product-${id}`],
  })();
}

async function fetchActiveProductById(id: string): Promise<Product | null> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle<ProductRow>();

  if (error) {
    throw new Error(`Failed to fetch product "${id}": ${error.message}`);
  }

  if (!data) return null;

  // Reuses the bulk variant fetcher (already on the anon/public client) for
  // a single id instead of duplicating the query — see `getVariantsByProductId`.
  let variants: ProductVariant[] = [];
  try {
    const variantsByProductId = await getVariantsByProductId([id]);
    variants = variantsByProductId.get(id) ?? [];
  } catch (variantsError) {
    console.error(`[productService] Failed to fetch variants for product "${id}":`, variantsError);
  }

  return mapRowToProduct(data, variants);
}

/**
 * Fetches a page of products for the admin product list, including inactive
 * ones, optionally scoped by a text search against `name`. Same RLS caveat
 * as `getProductById` applies.
 *
 * Ordered by `updated_at` (not `created_at`) descending, so an admin who
 * just edited a product sees it surface at the top of the list instead of
 * having to search for it among older, untouched rows.
 */
export async function getAllProductsForAdmin(
  filters: AdminProductFilters = {},
): Promise<PaginatedProducts> {
  const supabase = await createClient();

  const [from, to] = toRange(filters.page ?? 1, ADMIN_PAGE_SIZE);

  let query = supabase
    .from("products")
    .select(PRODUCT_COLUMNS, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (filters.searchQuery) {
    query = query.ilike("name", `%${filters.searchQuery}%`);
  }

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("created_at", endOfDayIso(filters.endDate));
  }

  const { data, error, count } = await query.returns<ProductRow[]>();

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  const totalCount = count ?? 0;

  return {
    data: (data ?? []).map((row) => mapRowToProduct(row)),
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / ADMIN_PAGE_SIZE)),
  };
}

/**
 * Fetches every product matching the admin list's current search/date
 * filters, with no `.range()` pagination — backs the CSV export so it
 * captures the full filtered set instead of only whichever page is
 * currently rendered.
 */
export async function getAllProductsForExport(
  filters: Omit<AdminProductFilters, "page"> = {},
): Promise<Product[]> {
  const supabase = await createClient();

  let query = supabase.from("products").select(PRODUCT_COLUMNS).order("updated_at", { ascending: false });

  if (filters.searchQuery) {
    query = query.ilike("name", `%${filters.searchQuery}%`);
  }

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("created_at", endOfDayIso(filters.endDate));
  }

  const { data, error } = await query.returns<ProductRow[]>();

  if (error) {
    throw new Error(`Failed to fetch products for export: ${error.message}`);
  }

  return (data ?? []).map((row) => mapRowToProduct(row));
}

/** Number of cross-sell cards shown in the product detail page's "related products" section. */
const RELATED_PRODUCTS_LIMIT = 4;

/**
 * Fetches a small set of active products sharing the same category as
 * `categoryId`, excluding the product currently being viewed — powers the
 * "También te podría gustar" cross-sell section on the product detail page.
 * Returns an empty array when the product has no category to match against.
 */
export async function getRelatedProducts(
  categoryId: string | null,
  excludeProductId: string,
): Promise<Product[]> {
  if (!categoryId) return [];

  // Cached for an hour — read on every product detail page visit. Both
  // arguments are passed into the cache key since they're closed over
  // rather than forwarded to the wrapped function itself.
  return unstable_cache(
    () => fetchRelatedProducts(categoryId, excludeProductId),
    ["related-products", categoryId, excludeProductId],
    { revalidate: 3600, tags: ["products"] },
  )();
}

async function fetchRelatedProducts(categoryId: string, excludeProductId: string): Promise<Product[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_active", true)
    .eq("category_id", categoryId)
    .neq("id", excludeProductId)
    .order("created_at", { ascending: false })
    .limit(RELATED_PRODUCTS_LIMIT)
    .returns<ProductRow[]>();

  if (error) {
    throw new Error(`Failed to fetch related products for category "${categoryId}": ${error.message}`);
  }

  return (data ?? []).map((row) => mapRowToProduct(row));
}

/**
 * Fetches every product (active and inactive, unpaginated), for the
 * "Productos de la Colección" picker in the admin `CollectionForm`. The
 * picker needs the complete catalog at once so the admin can search/toggle
 * any product locally, rather than paging through it.
 */
export async function getAllProductsForCollectionPicker(): Promise<ProductPickerItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, image_urls, collection_id")
    .order("name")
    .returns<Pick<ProductRow, "id" | "name" | "image_urls" | "collection_id">[]>();

  if (error) {
    throw new Error(`Failed to fetch products for collection picker: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    imageUrl: row.image_urls[0] ?? null,
    collectionId: row.collection_id,
  }));
}
