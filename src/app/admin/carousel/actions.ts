"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toSafeErrorMessage, type ActionResult } from "@/lib/actionResult";
import { getAllHeroSlidesForAdmin } from "@/services/heroSlideService";

/** Input shape accepted by the create/update Server Actions, matching `HeroSlideForm`. */
export interface HeroSlideFormInput {
  imageUrl: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  isActive: boolean;
}

// -----------------------------------------------------------------------------
// Note on authorization: these Server Actions run through the anon-key
// Supabase client, so every write is governed entirely by the
// `hero_slides_admin_write` RLS policy (`is_admin()`) — the same
// defense-in-depth model used by `admin/collections/actions.ts`.
//
// Note on error handling: every action below returns `{ error }` instead of
// throwing, so raw Postgres error messages never reach the client.
// -----------------------------------------------------------------------------

/**
 * Revalidates both the admin list and the storefront's cached carousel
 * after any write. `updateTag` (not `revalidateTag`) is used here because
 * every caller of this helper is a Server Action: it expires the
 * "hero-slides" tag immediately so the admin's own next request for the
 * Home page never serves stale, pre-edit slides (read-your-own-writes).
 */
function revalidateHeroSlides(): void {
  revalidatePath("/admin/carousel");
  revalidatePath("/");
  updateTag("hero-slides");
}

export async function createHeroSlide(input: HeroSlideFormInput): Promise<ActionResult> {
  if (!input.imageUrl) {
    return { error: "La imagen de fondo es obligatoria." };
  }

  const supabase = await createClient();

  // New slides join at the end of the current order.
  const { data: lastSlide } = await supabase
    .from("hero_slides")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ display_order: number }>();

  const { error } = await supabase.from("hero_slides").insert({
    image_url: input.imageUrl,
    title: input.title.trim() || null,
    subtitle: input.subtitle.trim() || null,
    button_text: input.buttonText.trim() || null,
    button_link: input.buttonLink.trim() || null,
    display_order: (lastSlide?.display_order ?? -1) + 1,
    is_active: input.isActive,
  });

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo crear el slide.") };
  }

  revalidateHeroSlides();
  return {};
}

export async function updateHeroSlide(id: string, input: HeroSlideFormInput): Promise<ActionResult> {
  if (!input.imageUrl) {
    return { error: "La imagen de fondo es obligatoria." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("hero_slides")
    .update({
      image_url: input.imageUrl,
      title: input.title.trim() || null,
      subtitle: input.subtitle.trim() || null,
      button_text: input.buttonText.trim() || null,
      button_link: input.buttonLink.trim() || null,
      is_active: input.isActive,
    })
    .eq("id", id);

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo actualizar el slide.") };
  }

  revalidateHeroSlides();
  return {};
}

export async function deleteHeroSlide(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("hero_slides").delete().eq("id", id);

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo eliminar el slide.") };
  }

  revalidateHeroSlides();
  return {};
}

/** Quick active/inactive toggle from the admin list, without opening the full edit form. */
export async function toggleHeroSlideActive(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("hero_slides").update({ is_active: isActive }).eq("id", id);

  if (error) {
    return { error: toSafeErrorMessage(error, "No se pudo actualizar el estado del slide.") };
  }

  revalidateHeroSlides();
  return {};
}

/**
 * Swaps `display_order` between a slide and its immediate neighbor in the
 * given direction, moving it one position up/down in the carousel. Reads
 * the full admin-ordered list fresh (never trusting a client-supplied
 * index) so the swap is always based on the current, authoritative order.
 */
export async function moveHeroSlide(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const slides = await getAllHeroSlidesForAdmin();
  const index = slides.findIndex((slide) => slide.id === id);

  if (index === -1) {
    return { error: "No se encontró el slide." };
  }

  const neighbor = slides[direction === "up" ? index - 1 : index + 1];

  // Already at the top/bottom of the list — nothing to swap with.
  if (!neighbor) {
    return {};
  }

  const current = slides[index];
  const supabase = await createClient();

  const [{ error: currentError }, { error: neighborError }] = await Promise.all([
    supabase.from("hero_slides").update({ display_order: neighbor.displayOrder }).eq("id", current.id),
    supabase.from("hero_slides").update({ display_order: current.displayOrder }).eq("id", neighbor.id),
  ]);

  if (currentError || neighborError) {
    return { error: "No se pudo reordenar el carrusel." };
  }

  revalidateHeroSlides();
  return {};
}
