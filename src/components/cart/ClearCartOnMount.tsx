"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";

/**
 * Empties the persisted cart once the order has already been placed
 * server-side (checkout's POST to `/api/checkout` already created the
 * `orders`/`order_items` rows before redirecting to Mercado Pago). Rendered
 * on `/carrito/exito` and `/carrito/pendiente` — NOT on `/carrito/error`,
 * where the user should still be able to retry with the same items.
 *
 * Reads the store via `getState()` instead of the `useCartStore()` hook
 * since this component only needs to fire the action once, on mount, and
 * has no UI of its own to re-render.
 */
export function ClearCartOnMount() {
  useEffect(() => {
    useCartStore.getState().clearCart();
  }, []);

  return null;
}
