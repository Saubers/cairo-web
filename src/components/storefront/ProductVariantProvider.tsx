"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ColorOption, Product } from "@/types";

/** Fallback label for a product whose own `color` field was never set. */
const DEFAULT_BASE_COLOR_NAME = "Original";

/**
 * Builds the product's own top-level `color`/`stock`/`imageUrls` as a
 * synthetic, always-present "base color" option — `variantId: null` marks
 * it as not a real `product_variants` row, mirroring the existing
 * `CartItem.variantId` convention. This is what lets the PDP keep the
 * original color selectable even after a real variant has been chosen.
 */
function buildBaseColorOption(product: Product): ColorOption {
  return {
    variantId: null,
    colorName: product.color?.trim() || DEFAULT_BASE_COLOR_NAME,
    colorHex: null,
    images: product.imageUrls,
    stock: product.stock,
  };
}

/**
 * Unifies the product's base color with its real variants into one flat,
 * equally-selectable list, so the color swatches and the "add to cart"
 * logic never have to special-case "no variant selected" vs. "a variant is
 * selected" — every entry here is a normal, valid selection.
 */
export function buildColorOptions(product: Product): ColorOption[] {
  const baseOption = buildBaseColorOption(product);
  const variantOptions: ColorOption[] = product.variants.map((variant) => ({
    variantId: variant.id,
    colorName: variant.colorName,
    colorHex: variant.colorHex,
    images: variant.images,
    stock: variant.stock,
  }));

  return [baseOption, ...variantOptions];
}

interface ProductVariantContextValue {
  product: Product;
  /** Every selectable color, base color first, in display order. */
  colorOptions: ColorOption[];
  /** `null` only if no option has been explicitly selected yet. */
  selectedColor: ColorOption | null;
  selectColor: (option: ColorOption) => void;
}

const ProductVariantContext = createContext<ProductVariantContextValue | null>(null);

interface ProductVariantProviderProps {
  product: Product;
  /** Resolved server-side from the `?color=` search param — see `producto/[id]/page.tsx`. */
  initialColor: ColorOption | null;
  children: ReactNode;
}

/**
 * Shares the selected color option across the product detail page's
 * gallery (left grid column) and quantity/add-to-cart controls (right grid
 * column) — two separate Client Components that otherwise have no direct
 * way to communicate.
 *
 * Selection is plain React state so switching colors is instant (no network
 * round-trip). The URL's `?color=` is kept in sync via `history.replaceState`
 * — not `router.replace` — specifically so it never triggers a Next.js
 * server re-render of this (fully dynamic, per `cookies()` in the root
 * Navbar) page; the URL only needs to stay shareable/bookmarkable.
 */
export function ProductVariantProvider({ product, initialColor, children }: ProductVariantProviderProps) {
  const colorOptions = buildColorOptions(product);
  const [selectedColor, setSelectedColor] = useState<ColorOption | null>(initialColor);

  function selectColor(option: ColorOption): void {
    setSelectedColor(option);

    const url = new URL(window.location.href);
    url.searchParams.set("color", option.colorName);
    window.history.replaceState(null, "", url);
  }

  return (
    <ProductVariantContext.Provider value={{ product, colorOptions, selectedColor, selectColor }}>
      {children}
    </ProductVariantContext.Provider>
  );
}

export function useProductVariant(): ProductVariantContextValue {
  const context = useContext(ProductVariantContext);

  if (!context) {
    throw new Error("useProductVariant must be used within a ProductVariantProvider");
  }

  return context;
}
