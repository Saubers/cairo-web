"use client";

import { useState } from "react";
import Link from "next/link";
import type { ColorOption, Product } from "@/types";
import { AddToCartButton } from "@/components/storefront/AddToCartButton";
import { ProductImage } from "@/components/storefront/ProductImage";
import { ProductImageCarousel } from "@/components/storefront/ProductImageCarousel";
import { resolveSwatchColor } from "@/lib/colorSwatch";

/**
 * Caps the visible swatch row so a product with many colors never pushes
 * the card taller than its grid neighbors; the rest collapse into a "+N" badge.
 */
const MAX_VISIBLE_SWATCHES = 4;

interface ProductCardMediaProps {
  product: Product;
  /** Link target for the image and swatch fallback navigation — already carries `?color=` when the active catalog filter matched a variant. */
  href: string;
  /** Images for the currently displayed (default/filtered) color, used by the swipeable carousel. */
  images: string[];
  /** Every selectable color (base + variants), used to render the quick-preview swatches below the image. */
  colorOptions: ColorOption[];
  priority: boolean;
  hasDiscount: boolean;
  outOfStock: boolean;
  activeColorFilter?: string[];
}

/**
 * Client-side island owning the card's image area and color swatches.
 * Isolated from `ProductCard` (a Server Component, kept SEO-crawlable for
 * its title/price markup) so the swatch hover-preview below can share local
 * state with the image it controls, without turning the whole card client-side.
 */
export function ProductCardMedia({
  product,
  href,
  images,
  colorOptions,
  priority,
  hasDiscount,
  outOfStock,
  activeColorFilter,
}: ProductCardMediaProps) {
  const defaultImage = images[0] ?? null;
  const [previewImage, setPreviewImage] = useState<string | null>(defaultImage);

  // Only swap to a single static preview while a swatch is actively
  // hovered/touched — otherwise keep the normal swipeable carousel for the
  // currently displayed color.
  const isPreviewingSwatch = previewImage !== defaultImage;

  const visibleSwatches = colorOptions.slice(0, MAX_VISIBLE_SWATCHES);
  const hiddenSwatchCount = colorOptions.length - visibleSwatches.length;

  function handleSwatchPreview(option: ColorOption): void {
    const previewSrc = option.images[0];
    if (previewSrc) setPreviewImage(previewSrc);
  }

  function handleSwatchLeave(): void {
    setPreviewImage(defaultImage);
  }

  return (
    <>
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-white">
        <Link href={href} aria-label={product.name} className="absolute inset-0 z-0 block">
          {isPreviewingSwatch && previewImage ? (
            // Remounting on every `previewImage` change (via `key`) resets
            // `ProductImage`'s own fade-in state, so each color swap still
            // transitions in smoothly instead of popping in abruptly.
            <ProductImage
              key={previewImage}
              src={previewImage}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              hoverLift={false}
              dropShadow={false}
              className="transition-opacity duration-300"
            />
          ) : (
            <ProductImageCarousel images={images} alt={product.name} priority={priority} />
          )}
        </Link>

        {hasDiscount && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-cairo-primary px-2.5 py-1 text-xs font-semibold text-cairo-bg">
            -{product.discountPercentage}% OFF
          </span>
        )}

        {outOfStock && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-cairo-text px-2.5 py-1 text-xs font-semibold text-cairo-bg">
            Agotado
          </span>
        )}

        <div className="absolute bottom-3 right-3 z-10">
          <AddToCartButton product={product} activeColorFilter={activeColorFilter} />
        </div>
      </div>

      {/* Only rendered when there's an actual choice to preview — a single-color
          product stays visually identical to before this feature existed. */}
      {colorOptions.length > 1 && (
        <div className="flex items-center gap-1.5 px-4 pt-3" aria-label="Colores disponibles">
          {visibleSwatches.map((option) => (
            <Link
              key={option.variantId ?? "base"}
              href={`/producto/${product.id}?color=${encodeURIComponent(option.colorName)}`}
              title={option.colorName}
              onMouseEnter={() => handleSwatchPreview(option)}
              onMouseLeave={handleSwatchLeave}
              onTouchStart={() => handleSwatchPreview(option)}
              className="h-4 w-4 shrink-0 rounded-full border border-gray-200 shadow-sm transition-transform duration-150 hover:scale-110"
              style={{ backgroundColor: resolveSwatchColor(option) }}
            >
              <span className="sr-only">{option.colorName}</span>
            </Link>
          ))}
          {hiddenSwatchCount > 0 && (
            <span className="text-[10px] font-medium text-cairo-text/50">+{hiddenSwatchCount}</span>
          )}
        </div>
      )}
    </>
  );
}
