import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  // `true` once the `persist` middleware has finished reading `localStorage`
  // and merged it into state. Lets consumers (e.g. the Navbar's cart badge)
  // avoid rendering real cart data before SSR/first-paint, which otherwise
  // produces a visible flash — the server and the very first client render
  // always see the empty `items: []` initial state, then `items` jumps to
  // the persisted value a moment after mount.
  hasHydrated: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setHasHydrated: (value: boolean) => void;
}

/**
 * Client-side cart state, persisted to localStorage so the cart survives
 * page reloads. This store never talks to Supabase directly; checkout
 * submits its contents to the Node.js business logic layer
 * (`app/api/checkout/route.ts`), which is the only place order totals and
 * stock are authoritatively validated against the database.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find((i) => i.productId === item.productId);

          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i,
              ),
            };
          }

          return { items: [...state.items, item] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i,
          ),
        })),
      clearCart: () => set({ items: [] }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "cairo-cart",
      // Only `items` is worth persisting — `hasHydrated` must always start
      // `false` on a fresh load so the flag genuinely tracks this page
      // load's rehydration, not a stale value from a previous session.
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
