import type { ColorOption, Product } from "@/types";
import { buildColorOptions } from "@/lib/colorOptions";
import { normalizeColorKey } from "@/lib/colorName";

/**
 * Total stock across the product's base color and every real variant.
 * Used to decide whether an entire product (not just one color) is sold
 * out — e.g. to sort fully out-of-stock products to the end of the
 * catalog grid instead of just looking at `product.stock` alone.
 */
export function getTotalStock(product: Product): number {
  return buildColorOptions(product).reduce((total, option) => total + option.stock, 0);
}

/** Case/diacritic-insensitive comparison between a color name and the active color filter list. */
export function matchesActiveColorFilter(colorName: string, activeColorFilter?: string[]): boolean {
  if (!activeColorFilter || activeColorFilter.length === 0) return false;

  const normalizedColorName = normalizeColorKey(colorName);
  return activeColorFilter.some((filterColor) => normalizeColorKey(filterColor) === normalizedColorName);
}

/**
 * Picks which color option a catalog card should display, taking the
 * shopper's active color filter (if any) into account so a card never shows
 * a color the shopper didn't search for while implying it's the match.
 *
 * Priority order:
 * 1. A color option matching the active filter (case-insensitive) that
 *    still has stock — this is the color the shopper actually searched for.
 * 2. A color option matching the active filter with no stock left — shown
 *    anyway (the card renders an "Agotado" badge for it) so the shopper
 *    understands why this product matched their search.
 * 3. No filter applied, or no color in the filter matches this product at
 *    all — falls back to the first color option (base color first, then
 *    variants in creation order, see `buildColorOptions`) that still has
 *    stock. `null` only when the base color and every variant are sold out.
 */
export function getAvailableDisplayVariant(
  product: Product,
  activeColorFilter?: string[],
): ColorOption | null {
  const colorOptions = buildColorOptions(product);

  if (activeColorFilter && activeColorFilter.length > 0) {
    const matchingOptions = colorOptions.filter((option) =>
      matchesActiveColorFilter(option.colorName, activeColorFilter),
    );

    const matchWithStock = matchingOptions.find((option) => option.stock > 0);
    if (matchWithStock) return matchWithStock;

    if (matchingOptions.length > 0) return matchingOptions[0];
  }

  return colorOptions.find((option) => option.stock > 0) ?? null;
}
