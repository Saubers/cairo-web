"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Maps a product id to its current live `stock` value. */
export type ProductsStockMap = Record<string, number>;

interface ProductStockRow {
  id: string;
  stock: number;
}

/**
 * Client-side hook that reads the live `stock` for a given set of product
 * ids, via the `products_public_read` RLS policy (no auth required).
 *
 * The cart's own state (`useCartStore`) is persisted to `localStorage` and
 * never re-validated against the database — a product's stock may have
 * changed (or the product may have sold out) since it was added. This hook
 * lets the cart page warn the user *before* they submit, mirroring
 * `useStoreSettings`'s pattern of a best-effort client read for UX, with
 * `/api/checkout`'s server-side check remaining the actual source of truth.
 *
 * Returns `{}` until the fetch resolves (or if it fails) — callers must
 * treat a missing id as "unknown, not yet loaded" rather than "out of
 * stock", so the UI never incorrectly blocks checkout on a transient fetch
 * failure.
 */
export function useProductsStock(productIds: string[]): ProductsStockMap {
  const [stockById, setStockById] = useState<ProductsStockMap>({});

  // Joined into a stable primitive so the effect doesn't re-run on every
  // render just because the caller passed a new array instance with the
  // same ids (e.g. derived inline from `items.map(...)`).
  const idsKey = productIds.slice().sort().join(",");

  useEffect(() => {
    let isMounted = true;

    if (!idsKey) {
      // Deferred to a microtask (not called synchronously in the effect
      // body) to avoid triggering a cascading render — same reasoning as
      // the Supabase `.then()` callback below.
      Promise.resolve().then(() => {
        if (isMounted) setStockById({});
      });
      return () => {
        isMounted = false;
      };
    }

    const supabase = createClient();

    supabase
      .from("products")
      .select("id, stock")
      .in("id", idsKey.split(","))
      .returns<ProductStockRow[]>()
      .then(({ data }) => {
        if (!isMounted || !data) return;

        setStockById(
          data.reduce<ProductsStockMap>((acc, row) => {
            acc[row.id] = row.stock;
            return acc;
          }, {}),
        );
      });

    return () => {
      isMounted = false;
    };
  }, [idsKey]);

  return stockById;
}
