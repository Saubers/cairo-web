"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Maps a cart line key (see `cartLineKey`) to its current live stock value. */
export type ProductsStockMap = Record<string, number>;

interface ProductStockRow {
  id: string;
  stock: number;
}

interface VariantStockRow {
  id: string;
  stock: number;
}

/** A cart line to check live stock for — a product id plus the selected variant, if any. */
export interface StockLookupItem {
  productId: string;
  variantId: string | null;
}

/**
 * Builds the key `useProductsStock` returns its results under for a given
 * cart line, so a variant-carrying line's stock is looked up independently
 * from its parent product's (and from other variants of the same product).
 */
export function cartLineKey(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? ""}`;
}

/**
 * Client-side hook that reads the live stock for a given set of cart lines,
 * via the `products_public_read`/`product_variants_public_read` RLS
 * policies (no auth required). Lines with a `variantId` read that variant's
 * own `stock`; lines without one read the parent product's `stock`.
 *
 * The cart's own state (`useCartStore`) is persisted to `localStorage` and
 * never re-validated against the database — a product/variant's stock may
 * have changed (or sold out) since it was added. This hook lets the cart
 * page warn the user *before* they submit, mirroring `useStoreSettings`'s
 * pattern of a best-effort client read for UX, with `/api/checkout`'s
 * server-side check remaining the actual source of truth.
 *
 * Returns `{}` until the fetch resolves (or if it fails) — callers must
 * treat a missing key as "unknown, not yet loaded" rather than "out of
 * stock", so the UI never incorrectly blocks checkout on a transient fetch
 * failure.
 */
export function useProductsStock(items: StockLookupItem[]): ProductsStockMap {
  const [stockByKey, setStockByKey] = useState<ProductsStockMap>({});

  // Joined into a stable primitive so the effect doesn't re-run on every
  // render just because the caller passed a new array instance with the
  // same lines (e.g. derived inline from `items.map(...)`).
  const linesKey = items
    .map((item) => cartLineKey(item.productId, item.variantId))
    .sort()
    .join(",");

  useEffect(() => {
    let isMounted = true;

    if (!linesKey) {
      // Deferred to a microtask (not called synchronously in the effect
      // body) to avoid triggering a cascading render — same reasoning as
      // the Supabase `.then()` callbacks below.
      Promise.resolve().then(() => {
        if (isMounted) setStockByKey({});
      });
      return () => {
        isMounted = false;
      };
    }

    const lines = linesKey.split(",").map((line) => {
      const [productId, variantId] = line.split(":");
      return { productId, variantId: variantId || null };
    });
    const productIds = [...new Set(lines.filter((line) => !line.variantId).map((line) => line.productId))];
    const variantIds = [...new Set(lines.filter((line) => line.variantId).map((line) => line.variantId as string))];

    const supabase = createClient();

    Promise.all([
      productIds.length > 0
        ? supabase.from("products").select("id, stock").in("id", productIds).returns<ProductStockRow[]>()
        : Promise.resolve({ data: [] as ProductStockRow[] }),
      variantIds.length > 0
        ? supabase
            .from("product_variants")
            .select("id, stock")
            .in("id", variantIds)
            .returns<VariantStockRow[]>()
        : Promise.resolve({ data: [] as VariantStockRow[] }),
    ]).then(([productsResult, variantsResult]) => {
      if (!isMounted) return;

      const nextStockByKey: ProductsStockMap = {};

      for (const row of productsResult.data ?? []) {
        nextStockByKey[cartLineKey(row.id, null)] = row.stock;
      }
      for (const row of variantsResult.data ?? []) {
        const line = lines.find((l) => l.variantId === row.id);
        if (line) {
          nextStockByKey[cartLineKey(line.productId, row.id)] = row.stock;
        }
      }

      setStockByKey(nextStockByKey);
    });

    return () => {
      isMounted = false;
    };
  }, [linesKey]);

  return stockByKey;
}
