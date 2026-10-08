/**
 * Applies a product's discount to its base price, when active.
 *
 * Used both client-side (storefront UI, cart preview) and server-side (the
 * checkout route, which is the only authoritative source of truth for what a
 * customer is actually charged). Rounded to the nearest integer — Cairo's
 * prices are whole ARS amounts (see the `PRICE_FORMATTER`s across the
 * storefront, which use `maximumFractionDigits: 0`) and Mercado Pago's API
 * is sensitive to stray decimals.
 */
export function calculateDiscountedPrice(
  price: number,
  discountPercentage: number | null,
  isActive: boolean,
): number {
  if (!isActive || !discountPercentage) return price;

  const discounted = price * (1 - discountPercentage / 100);
  return Math.round(discounted);
}
