"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Product, ProductVariant } from "@/types";

interface ProductVariantContextValue {
  product: Product;
  /** `null` when the product has no variants, or none is selected yet. */
  selectedVariant: ProductVariant | null;
  selectVariant: (variant: ProductVariant) => void;
}

const ProductVariantContext = createContext<ProductVariantContextValue | null>(null);

interface ProductVariantProviderProps {
  product: Product;
  /** Resolved server-side from the `?color=` search param — see `producto/[id]/page.tsx`. `null` for a product with no variants. */
  initialVariant: ProductVariant | null;
  children: ReactNode;
}

/**
 * Shares the selected color variant across the product detail page's
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
export function ProductVariantProvider({ product, initialVariant, children }: ProductVariantProviderProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(initialVariant);

  function selectVariant(variant: ProductVariant): void {
    setSelectedVariant(variant);

    const url = new URL(window.location.href);
    url.searchParams.set("color", variant.colorName);
    window.history.replaceState(null, "", url);
  }

  return (
    <ProductVariantContext.Provider value={{ product, selectedVariant, selectVariant }}>
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
