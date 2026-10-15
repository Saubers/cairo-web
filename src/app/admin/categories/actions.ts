"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toSafeErrorMessage, type ActionResult } from "@/lib/actionResult";

/** Derives a URL-safe slug from a category name (lowercase, no accents/punctuation). */
function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// -----------------------------------------------------------------------------
// Note on authorization: these Server Actions run through the anon-key
// Supabase client, so every write is governed entirely by the
// `categories_admin_write` RLS policy (`is_admin()`) — the same
// defense-in-depth model used by `admin/products/actions.ts`.
//
// Note on error handling: every action below returns `{ error }` instead of
// throwing, so raw Postgres error messages never reach the client.
// -----------------------------------------------------------------------------

export async function createCategory(name: string): Promise<ActionResult> {
  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return { error: "El nombre de la categoría debe tener al menos 2 caracteres." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .insert({ name: trimmedName, slug: slugify(trimmedName) });

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo crear la categoría.") };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/catalogo");
  return {};
}

export async function updateCategory(id: string, name: string): Promise<ActionResult> {
  const trimmedName = name.trim();

  if (trimmedName.length < 2) {
    return { error: "El nombre de la categoría debe tener al menos 2 caracteres." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("categories")
    .update({ name: trimmedName, slug: slugify(trimmedName) })
    .eq("id", id);

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo actualizar la categoría.") };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath("/producto/[id]", "page");
  return {};
}

/**
 * Deletes a category. Products referencing it have `category_id` set to
 * `null` automatically (`on delete set null`), so they survive as
 * "uncategorized" rather than being deleted themselves.
 */
export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo eliminar la categoría.") };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath("/producto/[id]", "page");
  return {};
}
