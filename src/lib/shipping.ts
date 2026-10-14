/**
 * Flat-rate shipping config fallback. No external quoting API (e.g.
 * Andreani) and no postal-code-based pricing — every order ships to a
 * home address nationwide for a single flat rate, waived above a subtotal
 * threshold.
 *
 * The live values are stored in the `store_settings` table (editable from
 * `/admin/configuracion`) and read via `useStoreSettings` (client) or
 * `getStoreSettings` (server) — these constants are only used as the
 * fallback before that fetch resolves, or if the table is ever unreachable.
 */
export const FREE_SHIPPING_THRESHOLD = 55000;
export const FLAT_SHIPPING_RATE = 6500;

export interface ShippingResult {
  /** Shipping cost in ARS: 0 when the subtotal meets the free-shipping threshold. */
  cost: number;
  isFree: boolean;
  /** Final amount to charge: `subtotal + cost`. */
  total: number;
  /** ARS still needed to reach free shipping; 0 once `isFree` is true. */
  remainingForFreeShipping: number;
}

/**
 * Computes the flat-rate shipping cost and total for a given cart subtotal.
 * `threshold`/`rate` default to the hardcoded fallback constants above, but
 * callers should pass the live `store_settings` values whenever available.
 */
export function calculateShipping(
  subtotal: number,
  threshold: number = FREE_SHIPPING_THRESHOLD,
  rate: number = FLAT_SHIPPING_RATE,
): ShippingResult {
  const isFree = subtotal >= threshold;
  const cost = isFree ? 0 : rate;

  return {
    cost,
    isFree,
    total: subtotal + cost,
    remainingForFreeShipping: isFree ? 0 : threshold - subtotal,
  };
}
