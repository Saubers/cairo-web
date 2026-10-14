import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/types";

/** Raw shape returned by Supabase for the `categories` table (snake_case columns). */
interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

function mapRowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
  };
}

/**
 * Fetches all categories, ordered by name, for use in the storefront
 * category filter and the admin product form's category select.
 */
export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, created_at")
    .order("name")
    .returns<CategoryRow[]>();

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return (data ?? []).map(mapRowToCategory);
}

/**
 * Fetches a single category by id, for the product detail page's
 * breadcrumb trail. Returns `null` when no row matches (or when `id` is
 * `null`, i.e. the product has no category).
 */
export async function getCategoryById(id: string | null): Promise<Category | null> {
  if (!id) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, created_at")
    .eq("id", id)
    .maybeSingle<CategoryRow>();

  if (error) {
    throw new Error(`Failed to fetch category "${id}": ${error.message}`);
  }

  return data ? mapRowToCategory(data) : null;
}
