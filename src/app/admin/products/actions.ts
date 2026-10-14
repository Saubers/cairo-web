"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toSafeErrorMessage, type ActionResult } from "@/lib/actionResult";
import { productSchema } from "@/lib/validation/productSchema";
import { getAllProductsForExport } from "@/services/productService";
import { getCategories } from "@/services/categoryService";

/**
 * Input shape accepted by the create/update Server Actions, matching the
 * fields exposed on the admin `ProductForm`. This type only drives the
 * client-side form's own typing — `createProduct`/`updateProduct` below
 * still re-validate with `productSchema` at runtime, since a Server Action
 * is a POST endpoint reachable by anyone who can replay the same request,
 * not only through this form.
 */
export interface ProductFormInput {
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string | null;
  collectionId: string | null;
  color: string;
  imageUrls: string[];
  isActive: boolean;
  discountPercentage: number | null;
  isDiscountActive: boolean;
}

// -----------------------------------------------------------------------------
// Note on authorization: these Server Actions run through the anon-key
// Supabase client (`@/lib/supabase/server`), so writes are governed entirely
// by the `products_admin_write` RLS policy (`is_admin()`). Until Supabase
// Auth + the role check in `src/app/admin/layout.tsx` are wired up, calling
// these actions from an unauthenticated session will fail at the RLS layer,
// not silently bypass it.
//
// Note on error handling: every action below returns `{ error }` instead of
// throwing. Raw Postgres error messages (which can leak column/constraint
// names) never reach the client — `toSafeErrorMessage` maps known error
// codes to a friendly message and falls back to a generic one otherwise.
// -----------------------------------------------------------------------------

export async function createProduct(input: unknown): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del producto." };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.from("products").insert({
    name: data.name,
    slug: data.slug,
    description: data.description || null,
    price: data.price,
    stock: data.stock,
    category_id: data.categoryId,
    collection_id: data.collectionId,
    color: data.color || null,
    image_urls: data.imageUrls,
    is_active: data.isActive,
    discount_percentage: data.discountPercentage,
    is_discount_active: data.isDiscountActive,
  });

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo crear el producto.") };
  }

  revalidatePath("/admin/products");
  revalidatePath("/catalogo");
  return {};
}

export async function updateProduct(id: string, input: unknown): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del producto." };
  }

  const data = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      price: data.price,
      stock: data.stock,
      category_id: data.categoryId,
      collection_id: data.collectionId,
      color: data.color || null,
      image_urls: data.imageUrls,
      is_active: data.isActive,
      discount_percentage: data.discountPercentage,
      is_discount_active: data.isDiscountActive,
    })
    .eq("id", id);

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo actualizar el producto.") };
  }

  revalidatePath("/admin/products");
  revalidatePath("/catalogo");
  revalidatePath("/producto/[id]", "page");
  revalidatePath("/colecciones/[slug]", "page");
  return {};
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo eliminar el producto.") };
  }

  revalidatePath("/admin/products");
  revalidatePath("/catalogo");
  revalidatePath("/colecciones/[slug]", "page");
  return {};
}

/** Flat, Spanish-labeled row shape for the products CSV export. */
export interface ProductExportRow {
  Nombre: string;
  Categoría: string;
  Color: string;
  Precio: number;
  Stock: number;
  Estado: string;
}

/** Search/date filters accepted by the products CSV export, mirroring the list page's URL params. */
export interface ProductExportFilters {
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Builds the CSV rows for the admin products export, re-querying Supabase
 * with the same `searchQuery`/date range currently active on the list page
 * so the export captures the full matching set, not just the rendered page.
 */
export async function exportProductsForCsv(filters: ProductExportFilters = {}): Promise<ProductExportRow[]> {
  const [products, categories] = await Promise.all([getAllProductsForExport(filters), getCategories()]);

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  return products.map((product) => ({
    Nombre: product.name,
    Categoría: product.categoryId ? categoryNameById.get(product.categoryId) ?? "-" : "-",
    Color: product.color ?? "-",
    Precio: product.price,
    Stock: product.stock,
    Estado: product.isActive ? "Activo" : "Inactivo",
  }));
}
