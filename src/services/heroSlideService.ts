import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { HeroSlide } from "@/types";

/** Raw shape returned by Supabase for the `hero_slides` table (snake_case columns). */
interface HeroSlideRow {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  button_text: string | null;
  button_link: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const HERO_SLIDE_COLUMNS =
  "id, image_url, title, subtitle, button_text, button_link, display_order, is_active, created_at, updated_at";

function mapRowToHeroSlide(row: HeroSlideRow): HeroSlide {
  return {
    id: row.id,
    imageUrl: row.image_url,
    title: row.title,
    subtitle: row.subtitle,
    buttonText: row.button_text,
    buttonLink: row.button_link,
    displayOrder: row.display_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetches every slide (active and inactive), ordered for display, for the
 * admin carousel manager. RLS exposes inactive rows only to admins
 * (`hero_slides_public_read`).
 */
export async function getAllHeroSlidesForAdmin(): Promise<HeroSlide[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hero_slides")
    .select(HERO_SLIDE_COLUMNS)
    .order("display_order", { ascending: true })
    .returns<HeroSlideRow[]>();

  if (error) {
    throw new Error(`Failed to fetch hero slides: ${error.message}`);
  }

  return (data ?? []).map(mapRowToHeroSlide);
}

/** Fetches a single slide by id, for the admin edit form. */
export async function getHeroSlideById(id: string): Promise<HeroSlide | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hero_slides")
    .select(HERO_SLIDE_COLUMNS)
    .eq("id", id)
    .maybeSingle<HeroSlideRow>();

  if (error) {
    throw new Error(`Failed to fetch hero slide "${id}": ${error.message}`);
  }

  return data ? mapRowToHeroSlide(data) : null;
}

/**
 * Uncached fetch of the active, ordered slides shown on the storefront
 * carousel. Deliberately uses the plain anon-key `createPublicClient`
 * instead of the cookie-bound `createClient` from `@/lib/supabase/server`
 * — Next.js forbids reading cookies inside a function wrapped in
 * `unstable_cache`, and the public `hero_slides_public_read` RLS policy
 * never depends on the caller's session anyway, so a cookie-less client is
 * both required here and perfectly safe.
 */
async function fetchActiveHeroSlides(): Promise<HeroSlide[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("hero_slides")
    .select(HERO_SLIDE_COLUMNS)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .returns<HeroSlideRow[]>();

  if (error) {
    throw new Error(`Failed to fetch active hero slides: ${error.message}`);
  }

  return (data ?? []).map(mapRowToHeroSlide);
}

/**
 * Cached storefront read of the active hero carousel. The Home page is the
 * highest-traffic route in the app, so this is cached for an hour via
 * Next.js' Data Cache (`unstable_cache` — a standard web-fetch wrapper,
 * Cloudflare Edge Runtime compatible) instead of hitting Supabase on every
 * request. Admin mutations in `app/admin/carousel/actions.ts` call
 * `revalidateTag("hero-slides")` to bust this immediately rather than
 * waiting out the hour.
 */
export const getActiveHeroSlides = unstable_cache(fetchActiveHeroSlides, ["active-hero-slides"], {
  revalidate: 3600,
  tags: ["hero-slides"],
});
