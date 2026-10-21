import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
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
 * Uncached implementation behind the `getCategories` cache wrapper below.
 * Uses the plain anon-key client (not cookie-bound) since it's wrapped in
 * `unstable_cache`, which forbids reading cookies — and categories carry
 * no role-gated visibility, so there's nothing session-dependent to lose.
 */
async function fetchCategories(): Promise<Category[]> {
  const supabase = createPublicClient();

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
 * Fetches all categories, ordered by name, for use in the storefront
 * category filter and the admin product form's category select. Cached
 * for an hour — categories rarely change and this is read on nearly every
 * page. `app/admin/categories/actions.ts` calls `updateTag("categories")`
 * to bust this immediately after a create/rename/delete.
 */
export const getCategories = unstable_cache(fetchCategories, ["categories"], {
  revalidate: 3600,
  tags: ["categories"],
});

/**
 * Uncached implementation behind the `getCategoryById` cache wrapper below.
 */
async function fetchCategoryById(id: string): Promise<Category | null> {
  const supabase = createPublicClient();

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

/**
 * Fetches a single category by id, for the product detail page's
 * breadcrumb trail. Returns `null` when no row matches (or when `id` is
 * `null`, i.e. the product has no category). Cached for an hour, same tag
 * as `getCategories`.
 */
export async function getCategoryById(id: string | null): Promise<Category | null> {
  if (!id) return null;

  return unstable_cache(() => fetchCategoryById(id), ["category", id], {
    revalidate: 3600,
    tags: ["categories"],
  })();
}
