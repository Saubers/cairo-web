"use client";

import { useProductVariant } from "@/components/storefront/ProductVariantProvider";

/**
 * Visual color swatches for the product detail page. Renders nothing when
 * the product has no variants, so a non-variant product's page is visually
 * identical to before this feature existed.
 */
export function ProductColorSwatches() {
  const { product, selectedVariant, selectVariant } = useProductVariant();

  if (product.variants.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Elegí un color">
      {product.variants.map((variant) => {
        const isSelected = selectedVariant?.id === variant.id;

        return (
          <button
            key={variant.id}
            type="button"
            onClick={() => selectVariant(variant)}
            aria-pressed={isSelected}
            title={variant.colorName}
            className={`h-9 w-9 rounded-full border-2 transition-colors ${
              isSelected ? "border-cairo-primary" : "border-transparent hover:border-cairo-text/30"
            }`}
            style={{ backgroundColor: variant.colorHex ?? "#d4d4d4" }}
          >
            <span className="sr-only">{variant.colorName}</span>
          </button>
        );
      })}
      {selectedVariant && <span className="text-sm text-cairo-text/60">{selectedVariant.colorName}</span>}
    </div>
  );
}
