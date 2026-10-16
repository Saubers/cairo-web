"use client";

import { ProductGallery } from "@/components/storefront/ProductGallery";
import { useProductVariant } from "@/components/storefront/ProductVariantProvider";

/**
 * Thin wrapper around `ProductGallery` for the product detail page: swaps
 * to the selected variant's single image when the product has variants,
 * otherwise renders the product's own `imageUrls` unchanged. Kept separate
 * from `ProductGallery` itself so that component stays presentational/
 * reusable (it has no notion of variants or context).
 */
export function ProductGallerySection() {
  const { product, selectedVariant } = useProductVariant();

  const images = product.variants.length > 0 && selectedVariant ? [selectedVariant.imageUrl] : product.imageUrls;

  return <ProductGallery images={images} alt={product.name} />;
}
