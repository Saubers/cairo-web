import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Collection } from "@/types";

/** Raw shape returned by Supabase for the `collections` table (snake_case columns). */
interface CollectionRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const COLLECTION_COLUMNS =
  "id, name, slug, description, image_url, is_active, created_at, updated_at";

function mapRowToCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetches every collection (active and inactive), for the admin list.
 * RLS exposes inactive rows only to admins (`collections_public_read`).
 */
export async function getAllCollectionsForAdmin(): Promise<Collection[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("collections")
    .select(COLLECTION_COLUMNS)
    .order("created_at", { ascending: false })
    .returns<CollectionRow[]>();

  if (error) {
    throw new Error(`Failed to fetch collections: ${error.message}`);
  }

  return (data ?? []).map(mapRowToCollection);
}

/**
 * Uncached implementation behind the `getActiveCollections` cache wrapper
 * below. Uses the plain anon-key client since it's wrapped in
 * `unstable_cache` — the `is_active = true` filter is already explicit in
 * the query, so this is identical for every caller regardless of role.
 */
async function fetchActiveCollections(): Promise<Collection[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("collections")
    .select(COLLECTION_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .returns<CollectionRow[]>();

  if (error) {
    throw new Error(`Failed to fetch active collections: ${error.message}`);
  }

  return (data ?? []).map(mapRowToCollection);
}

/**
 * Fetches only active collections, for the storefront `/colecciones` page
 * and the admin product form's collection picker. Cached for an hour —
 * `app/admin/collections/actions.ts` calls `updateTag("collections")` to
 * bust this immediately after a create/update/delete.
 */
export const getActiveCollections = unstable_cache(fetchActiveCollections, ["active-collections"], {
  revalidate: 3600,
  tags: ["collections"],
});

/** Fetches a single collection by id, for the admin edit form. */
export async function getCollectionById(id: string): Promise<Collection | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("collections")
    .select(COLLECTION_COLUMNS)
    .eq("id", id)
    .maybeSingle<CollectionRow>();

  if (error) {
    throw new Error(`Failed to fetch collection "${id}": ${error.message}`);
  }

  return data ? mapRowToCollection(data) : null;
}

/**
 * Uncached implementation behind the `getCollectionBySlug` cache wrapper
 * below.
 */
async function fetchCollectionBySlug(slug: string): Promise<Collection | null> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("collections")
    .select(COLLECTION_COLUMNS)
    .eq("slug", slug)
    .maybeSingle<CollectionRow>();

  if (error) {
    throw new Error(`Failed to fetch collection "${slug}": ${error.message}`);
  }

  return data ? mapRowToCollection(data) : null;
}

/**
 * Fetches a single collection by slug, for the storefront detail page.
 * Deliberately does not filter by `is_active` here — the caller must check
 * `isActive` itself and 404 accordingly, so an inactive collection 404s the
 * same way for every visitor, admins included (see `/colecciones/[slug]`) —
 * which is exactly why this is safe to cache with the plain anon client:
 * the result was already identical for every role before this change.
 * Cached for an hour, same tag as `getActiveCollections`.
 */
export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  return unstable_cache(() => fetchCollectionBySlug(slug), ["collection-by-slug", slug], {
    revalidate: 3600,
    tags: ["collections"],
  })();
}
