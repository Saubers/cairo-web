"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toSafeErrorMessage, type ActionResult } from "@/lib/actionResult";

/**
 * Input shape accepted by the create/update Server Actions, matching the
 * fields exposed on the admin `ProductForm`.
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

export async function createProduct(input: ProductFormInput): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("products").insert({
    name: input.name,
    slug: input.slug,
    description: input.description || null,
    price: input.price,
    stock: input.stock,
    category_id: input.categoryId,
    collection_id: input.collectionId,
    color: input.color || null,
    image_urls: input.imageUrls,
    is_active: input.isActive,
    discount_percentage: input.discountPercentage,
    is_discount_active: input.isDiscountActive,
  });

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo crear el producto.") };
  }

  revalidatePath("/admin/products");
  return {};
}

export async function updateProduct(
  id: string,
  input: ProductFormInput,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      price: input.price,
      stock: input.stock,
      category_id: input.categoryId,
      collection_id: input.collectionId,
      color: input.color || null,
      image_urls: input.imageUrls,
      is_active: input.isActive,
      discount_percentage: input.discountPercentage,
      is_discount_active: input.isDiscountActive,
    })
    .eq("id", id);

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo actualizar el producto.") };
  }

  revalidatePath("/admin/products");
  return {};
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo eliminar el producto.") };
  }

  revalidatePath("/admin/products");
  return {};
}
