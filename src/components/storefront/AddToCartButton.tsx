"use client";

import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { calculateDiscountedPrice } from "@/lib/utils";
import { getAvailableDisplayVariant } from "@/lib/productStock";
import type { Product } from "@/types";

interface AddToCartButtonProps {
  product: Product;
  /** Forwarded from `ProductCard` so the variant resolution below stays in sync with the card's image. */
  activeColorFilter?: string[];
}

/**
 * Subtle "add to cart" trigger overlaid on the product image.
 * Isolated as its own Client Component so `ProductCard` itself can stay a
 * Server Component, keeping the catalog grid fully crawlable for SEO.
 */
export function AddToCartButton({ product, activeColorFilter }: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  // Same variant resolution (including the active color filter) as
  // `ProductCard`'s image, so the quick-add button's enabled state and the
  // color it actually adds always match what the card is visually showing.
  const displayVariant = getAvailableDisplayVariant(product, activeColorFilter);
  const outOfStock = displayVariant === null || displayVariant.stock === 0;

  function handleAddToCart(): void {
    if (outOfStock || !displayVariant) return;

    // Only attach a `colorName` when the product actually has configured
    // variants — otherwise every simple (no-variant) product would show a
    // meaningless "Original" caption in the cart.
    const hasVariants = product.variants.length > 0;

    addItem({
      productId: product.id,
      variantId: displayVariant.variantId,
      colorName: hasVariants ? displayVariant.colorName : null,
      name: product.name,
      // Store the discounted price (a client-side preview only — the
      // checkout route is the authoritative source of truth for totals).
      price: calculateDiscountedPrice(product.price, product.discountPercentage, product.isDiscountActive),
      quantity: 1,
      imageUrl: displayVariant.images[0] ?? product.imageUrls[0] ?? null,
    });
  }

  return (
    <button
      type="button"
      aria-label={outOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
      onClick={handleAddToCart}
      disabled={outOfStock}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-cairo-primary text-cairo-bg shadow-md transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:bg-cairo-text/30 disabled:hover:scale-100"
    >
      <ShoppingBag className="h-4 w-4" />
    </button>
  );
}
