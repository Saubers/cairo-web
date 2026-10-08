"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { calculateDiscountedPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductQuantityAddToCartProps {
  product: Product;
}

/** Feedback message shown briefly on the "add to cart" button after a click. */
const ADDED_FEEDBACK_MS = 2000;

/**
 * Quantity stepper + "add to cart" action for the product detail page.
 * Isolated as a Client Component (connects to `useCartStore`) so the
 * detail page itself stays a Server Component.
 */
export function ProductQuantityAddToCart({ product }: ProductQuantityAddToCartProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const outOfStock = product.stock <= 0;

  function handleDecrease(): void {
    setQuantity((prev) => Math.max(1, prev - 1));
  }

  function handleIncrease(): void {
    setQuantity((prev) => Math.min(product.stock, prev + 1));
  }

  function handleAddToCart(): void {
    addItem({
      productId: product.id,
      name: product.name,
      // Store the discounted price (a client-side preview only — the
      // checkout route is the authoritative source of truth for totals).
      price: calculateDiscountedPrice(product.price, product.discountPercentage, product.isDiscountActive),
      quantity,
      imageUrl: product.imageUrls[0] ?? null,
    });

    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), ADDED_FEEDBACK_MS);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-cairo-text">Cantidad</span>
        <div className="flex items-center gap-3 rounded-full border border-cairo-text/20 px-3 py-1.5">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={handleDecrease}
            disabled={outOfStock}
            className="text-cairo-text transition-colors hover:text-cairo-primary disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-6 text-center text-sm text-cairo-text">{quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={handleIncrease}
            disabled={outOfStock || quantity >= product.stock}
            className="text-cairo-text transition-colors hover:text-cairo-primary disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={outOfStock}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-cairo-primary px-6 py-3 text-sm font-medium text-cairo-bg transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
      >
        <ShoppingBag className="h-4 w-4" />
        {outOfStock ? "Sin stock" : justAdded ? "¡Agregado!" : "Agregar al Carrito"}
      </button>
    </div>
  );
}
