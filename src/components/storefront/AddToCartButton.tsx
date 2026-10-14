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

  function handleAddToCart(): void {
    addItem({
      productId: product.id,
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
      aria-label={`Add ${product.name} to cart`}
      onClick={handleAddToCart}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-cairo-primary text-cairo-bg shadow-md transition-transform hover:scale-105"
    >
      <ShoppingBag className="h-4 w-4" />
    </button>
  );
}
