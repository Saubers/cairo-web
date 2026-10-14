"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toSafeErrorMessage, type ActionResult } from "@/lib/actionResult";

/** Derives a URL-safe slug from a collection name (lowercase, no accents/punctuation). */
function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Input shape accepted by the create/update Server Actions, matching `CollectionForm`. */
export interface CollectionFormInput {
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  /** IDs of the products that should belong to this collection after saving. */
  selectedProductIds: string[];
}

// -----------------------------------------------------------------------------
// Note on authorization: these Server Actions run through the anon-key
// Supabase client, so every write is governed entirely by the
// `collections_admin_write` RLS policy (`is_admin()`) — the same
// defense-in-depth model used by `admin/categories/actions.ts`.
//
// Note on error handling: every action below returns `{ error }` instead of
// throwing, so raw Postgres error messages never reach the client.
// -----------------------------------------------------------------------------

export async function createCollection(input: CollectionFormInput): Promise<ActionResult> {
  const trimmedName = input.name.trim();

  if (trimmedName.length < 2) {
    return { error: "El nombre de la colección debe tener al menos 2 caracteres." };
  }

  const supabase = await createClient();

  const { data: newCollection, error } = await supabase
    .from("collections")
    .insert({
      name: trimmedName,
      slug: slugify(trimmedName),
      description: input.description || null,
      image_url: input.imageUrl || null,
      is_active: input.isActive,
    })
    .select("id")
    .single();

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo crear la colección.") };
  }

  // Brand-new collection: no product can already point to it, so only the
  // assignment step (no cleanup step) is needed.
  if (input.selectedProductIds.length > 0) {
    const { error: assignError } = await supabase
      .from("products")
      .update({ collection_id: newCollection.id })
      .in("id", input.selectedProductIds);

    if (assignError) {
      return { error: toSafeErrorMessage(assignError, "No se pudieron asignar los productos.") };
    }
  }

  revalidatePath("/admin/collections");
  revalidatePath("/admin/products");
  revalidatePath("/colecciones");
  revalidatePath("/colecciones/[slug]", "page");
  return {};
}

export async function updateCollection(
  id: string,
  input: CollectionFormInput,
): Promise<ActionResult> {
  const trimmedName = input.name.trim();

  if (trimmedName.length < 2) {
    return { error: "El nombre de la colección debe tener al menos 2 caracteres." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("collections")
    .update({
      name: trimmedName,
      slug: slugify(trimmedName),
      description: input.description || null,
      image_url: input.imageUrl || null,
      is_active: input.isActive,
    })
    .eq("id", id);

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo actualizar la colección.") };
  }

  // Step A (cleanup): detach every product currently assigned to this
  // collection, including ones the admin just unchecked.
  const { error: detachError } = await supabase
    .from("products")
    .update({ collection_id: null })
    .eq("collection_id", id);

  if (detachError) {
    return { error: toSafeErrorMessage(detachError, "No se pudieron actualizar los productos.") };
  }

  // Step B (assignment): re-attach only the currently selected products.
  if (input.selectedProductIds.length > 0) {
    const { error: assignError } = await supabase
      .from("products")
      .update({ collection_id: id })
      .in("id", input.selectedProductIds);

    if (assignError) {
      return { error: toSafeErrorMessage(assignError, "No se pudieron asignar los productos.") };
    }
  }

  revalidatePath("/admin/collections");
  revalidatePath("/admin/products");
  revalidatePath("/colecciones");
  revalidatePath("/colecciones/[slug]", "page");
  return {};
}

export async function deleteCollection(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("collections").delete().eq("id", id);

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo eliminar la colección.") };
  }

  revalidatePath("/admin/collections");
  revalidatePath("/admin/products");
  revalidatePath("/colecciones");
  revalidatePath("/colecciones/[slug]", "page");
  return {};
}
