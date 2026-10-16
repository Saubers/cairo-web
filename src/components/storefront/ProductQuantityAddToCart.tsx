"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { calculateDiscountedPrice } from "@/lib/utils";
import { useProductVariant } from "@/components/storefront/ProductVariantProvider";

/** Feedback message shown briefly on the "add to cart" button after a click. */
const ADDED_FEEDBACK_MS = 2000;

/**
 * Quantity stepper + "add to cart" action for the product detail page.
 * Isolated as a Client Component (connects to `useCartStore`) so the
 * detail page itself stays a Server Component.
 *
 * Reads the product and currently selected color option from
 * `ProductVariantProvider` (shared with `ProductColorSwatches`/
 * `ProductGallerySection`) instead of taking them as direct props, since
 * the selection can change after this component first renders.
 * `selectedColor` is `null` only if nothing has been explicitly selected
 * yet — in that case "add to cart" is disabled rather than guessing.
 */
export function ProductQuantityAddToCart() {
  const { product, selectedColor } = useProductVariant();
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const availableStock = selectedColor?.stock ?? 0;
  const outOfStock = selectedColor !== null && availableStock <= 0;

  // Resets the quantity stepper whenever the selected color changes — a
  // quantity valid for one color's stock may exceed another's. Adjusted
  // directly during render (React's recommended pattern for resetting state
  // in response to a prop/context change) rather than in a `useEffect`, to
  // avoid an extra cascading render.
  const [lastSeenVariantId, setLastSeenVariantId] = useState(selectedColor?.variantId ?? null);

  if ((selectedColor?.variantId ?? null) !== lastSeenVariantId) {
    setLastSeenVariantId(selectedColor?.variantId ?? null);
    setQuantity(1);
  }

  function handleDecrease(): void {
    setQuantity((prev) => Math.max(1, prev - 1));
  }

  function handleIncrease(): void {
    setQuantity((prev) => Math.min(availableStock, prev + 1));
  }

  function handleAddToCart(): void {
    if (!selectedColor) return;

    addItem({
      productId: product.id,
      variantId: selectedColor.variantId,
      colorName: selectedColor.colorName,
      name: product.name,
      // Store the discounted price (a client-side preview only — the
      // checkout route is the authoritative source of truth for totals).
      price: calculateDiscountedPrice(product.price, product.discountPercentage, product.isDiscountActive),
      quantity,
      imageUrl: selectedColor.images[0] ?? null,
    });

    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), ADDED_FEEDBACK_MS);
  }

  const noColorSelected = selectedColor === null;
  const isAddDisabled = noColorSelected || outOfStock;

  function buttonLabel(): string {
    if (noColorSelected) return "Selecciona un color";
    if (outOfStock) return "Sin stock";
    if (justAdded) return "¡Agregado!";
    return "Agregar al Carrito";
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
            disabled={isAddDisabled}
            className="text-cairo-text transition-colors hover:text-cairo-primary disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-6 text-center text-sm text-cairo-text">{quantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={handleIncrease}
            disabled={isAddDisabled || quantity >= availableStock}
            className="text-cairo-text transition-colors hover:text-cairo-primary disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isAddDisabled}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-cairo-primary px-6 py-3 text-sm font-medium text-cairo-bg transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
      >
        <ShoppingBag className="h-4 w-4" />
        {buttonLabel()}
      </button>
    </div>
  );
}
