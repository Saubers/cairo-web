import type { ColorOption, Product } from "@/types";

/** Fallback label for a product whose own `color` field was never set. */
const DEFAULT_BASE_COLOR_NAME = "Original";

/**
 * Builds the product's own top-level `color`/`stock`/`imageUrls` as a
 * synthetic, always-present "base color" option — `variantId: null` marks
 * it as not a real `product_variants` row, mirroring the existing
 * `CartItem.variantId` convention. This is what lets the PDP keep the
 * original color selectable even after a real variant has been chosen.
 *
 * Defensive against missing/undefined fields: a product that only
 * partially loaded (e.g. `productService.getProductById` swallowed a
 * variants-fetch failure) must still degrade to an empty images array /
 * zero stock here, never crash the caller.
 */
function buildBaseColorOption(product: Product): ColorOption {
  return {
    variantId: null,
    colorName: product.color?.trim() || DEFAULT_BASE_COLOR_NAME,
    colorHex: null,
    images: Array.isArray(product.imageUrls) ? product.imageUrls : [],
    stock: product.stock ?? 0,
  };
}

/**
 * Unifies the product's base color with its real variants into one flat,
 * equally-selectable list, so the color swatches and the "add to cart"
 * logic never have to special-case "no variant selected" vs. "a variant is
 * selected" — every entry here is a normal, valid selection.
 *
 * Deliberately kept in its own plain (non-"use client") module: it's a
 * pure, framework-agnostic function with no React/hooks, called from both
 * the PDP Server Component (`producto/[id]/page.tsx`) and the Client
 * Component `ProductVariantProvider`. Exporting it from the Client
 * Component module instead would make the Server Component depend on a
 * client-boundary export — React bundles every export of a `"use client"`
 * file as a client reference, so calling it directly from server code is
 * unsafe and can throw at render time.
 */
export function buildColorOptions(product: Product): ColorOption[] {
  const baseOption = buildBaseColorOption(product);
  const variantOptions: ColorOption[] = (product.variants ?? []).map((variant) => ({
    variantId: variant.id,
    colorName: variant.colorName,
    colorHex: variant.colorHex ?? null,
    images: Array.isArray(variant.images) ? variant.images : [],
    stock: variant.stock ?? 0,
  }));

  return [baseOption, ...variantOptions];
}
