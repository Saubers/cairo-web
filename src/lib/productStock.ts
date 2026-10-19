import type { ColorOption, Product } from "@/types";
import { buildColorOptions } from "@/lib/colorOptions";

/**
 * Total stock across the product's base color and every real variant.
 * Used to decide whether an entire product (not just one color) is sold
 * out — e.g. to sort fully out-of-stock products to the end of the
 * catalog grid instead of just looking at `product.stock` alone.
 */
export function getTotalStock(product: Product): number {
  return buildColorOptions(product).reduce((total, option) => total + option.stock, 0);
}

/**
 * The first color option — base color first, then variants in creation
 * order, see `buildColorOptions` — that still has stock. `null` only when
 * the base color and every variant are sold out, which is the one case a
 * catalog card should actually show "Agotado" for.
 */
export function getAvailableDisplayVariant(product: Product): ColorOption | null {
  return buildColorOptions(product).find((option) => option.stock > 0) ?? null;
}
