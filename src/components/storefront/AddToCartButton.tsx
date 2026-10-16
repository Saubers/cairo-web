"use client";

import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { calculateDiscountedPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface AddToCartButtonProps {
  product: Product;
}

/**
 * Subtle "add to cart" trigger overlaid on the product image.
 * Isolated as its own Client Component so `ProductCard` itself can stay a
 * Server Component, keeping the catalog grid fully crawlable for SEO.
 */
export function AddToCartButton({ product }: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const outOfStock = product.stock <= 0;

  function handleAddToCart(): void {
    if (outOfStock) return;

    addItem({
      productId: product.id,
      // Catalog cards never fetch `variants` (see `mapRowToProduct`), so this
      // quick-add path has no color to attach — only the PDP's
      // `ProductQuantityAddToCart` resolves a real `variantId`/`colorName`.
      variantId: null,
      colorName: null,
      name: product.name,
      // Store the discounted price (a client-side preview only — the
      // checkout route is the authoritative source of truth for totals).
      price: calculateDiscountedPrice(product.price, product.discountPercentage, product.isDiscountActive),
      quantity: 1,
      imageUrl: product.imageUrls[0] ?? null,
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
