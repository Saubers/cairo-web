import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/types";

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
}

export interface AdminProductFilters {
  searchQuery?: string;
  /** 1-based page number. Defaults to 1. */
  page?: number;
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

function mapRowToProduct(row: ProductRow): Product {
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
 * Reads go through the anon key and are entirely governed by RLS (public
 * read access to active products, see docs/context/database-schema.md).
 * When a `categorySlug` is given but does not match any category, an empty
 * page is returned instead of silently falling back to all products.
 */
export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedProducts> {
  const supabase = await createClient();

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

  let query = supabase
    .from("products")
    .select(PRODUCT_COLUMNS, { count: "exact" })
    .eq("is_active", true)
    .order("created_at", { ascending: false })
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

  const { data, error, count } = await query.returns<ProductRow[]>();

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  const totalCount = count ?? 0;

  return {
    data: (data ?? []).map(mapRowToProduct),
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / PUBLIC_PAGE_SIZE)),
  };
}

/**
 * Distinct, sorted list of colors currently in use by active products.
 * Used to populate the color filter UI. PostgREST has no `DISTINCT`
 * operator, so deduplication happens in memory on the (small) result set.
 */
export async function getAvailableColors(): Promise<string[]> {
  const supabase = await createClient();

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

/**
 * Fetches a single product by id, regardless of `is_active`, for the admin
 * edit form. Returns `null` when no row matches.
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

  return data ? mapRowToProduct(data) : null;
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

  const { data, error, count } = await query.returns<ProductRow[]>();

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  const totalCount = count ?? 0;

  return {
    data: (data ?? []).map(mapRowToProduct),
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / ADMIN_PAGE_SIZE)),
  };
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
