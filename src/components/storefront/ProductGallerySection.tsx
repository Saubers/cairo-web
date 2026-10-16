"use client";

import { ProductGallery } from "@/components/storefront/ProductGallery";
import { useProductVariant } from "@/components/storefront/ProductVariantProvider";

/**
 * Thin wrapper around `ProductGallery` for the product detail page: shows
 * the currently selected color option's own images (base color or a real
 * variant — both expose `images: string[]` identically, see
 * `ProductVariantProvider`). Kept separate from `ProductGallery` itself so
 * that component stays presentational/reusable (it has no notion of
 * variants or context).
 */
export function ProductGallerySection() {
  const { product, selectedColor } = useProductVariant();

  const images = selectedColor?.images ?? product.imageUrls;

  return <ProductGallery images={images} alt={product.name} />;
}
