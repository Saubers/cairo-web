"use client";

import { useProductVariant } from "@/components/storefront/ProductVariantProvider";

/**
 * Visual color swatches for the product detail page. Renders every
 * selectable color, including the product's own base/original color
 * (always the first entry in `colorOptions` — see `ProductVariantProvider`)
 * so it's never lost once a real variant has been picked.
 *
 * Renders nothing when there is nothing to choose between (the base color
 * is the only option), so a non-variant product's page stays visually
 * identical to before this feature existed.
 */
export function ProductColorSwatches() {
  const { colorOptions, selectedColor, selectColor } = useProductVariant();

  if (colorOptions.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Elegí un color">
      {colorOptions.map((option) => {
        const isSelected = selectedColor?.variantId === option.variantId;

        return (
          <button
            key={option.variantId ?? "base"}
            type="button"
            onClick={() => selectColor(option)}
            aria-pressed={isSelected}
            title={option.colorName}
            className={`h-9 w-9 rounded-full border-2 transition-colors ${
              isSelected ? "border-cairo-primary" : "border-transparent hover:border-cairo-text/30"
            }`}
            style={{ backgroundColor: option.colorHex ?? "#d4d4d4" }}
          >
            <span className="sr-only">{option.colorName}</span>
          </button>
        );
      })}
      {selectedColor && <span className="text-sm text-cairo-text/60">{selectedColor.colorName}</span>}
    </div>
  );
}
