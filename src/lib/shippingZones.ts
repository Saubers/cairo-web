/**
 * Postal-code-based shipping zone estimator. This is the single source of
 * truth for what a shopper is charged for shipping — read by
 * `/api/checkout` (server, authoritative), `CartSummary` (client, live
 * preview), and `ShippingCalculator` (client, product-page estimator).
 *
 * This is intentionally separate from `calculateShipping` in
 * `src/lib/shipping.ts`, the older subtotal-based flat-rate/free-shipping-
 * threshold calculation. That function and its `store_settings` columns
 * are left in place but no longer drive the actual checkout charge — this
 * zone-based calculation replaces it for that purpose.
 *
 * No external carrier API (e.g. Andreani) is used here — zones are inferred
 * entirely from the first digit(s) of the Argentine postal code (CPA), and
 * prices come from the admin-configurable `store_settings` row rather than
 * being hardcoded.
 */

export interface ShippingZoneEstimate {
  /** Shipping cost in ARS. `0` means free. */
  price: number;
  /** Human-readable description of the shipping method for this zone. */
  message: string;
  /** Human-readable estimated delivery window. */
  estimatedDays: string;
}

/** The admin-configurable pieces of `store_settings` this calculation depends on. */
export interface ShippingZoneSettings {
  /** Postal code treated as "local" (free shipping / showroom pickup). */
  localPostalCode: string;
  /** Zone 1 (local) cost in ARS. */
  shippingCostLocal: number;
  /** Zone 3 (near: Centro/PBA/CABA) cost in ARS. */
  shippingCostNear: number;
  /** Zone 2 (far: North/South) cost in ARS. */
  shippingCostFar: number;
}

/**
 * Fallback used wherever the live `store_settings` row hasn't loaded yet
 * (or is unreachable) — matches the values the table is seeded with, so
 * behavior is unchanged until an admin edits them.
 */
export const DEFAULT_SHIPPING_ZONE_SETTINGS: ShippingZoneSettings = {
  localPostalCode: "2930",
  shippingCostLocal: 0,
  shippingCostNear: 15000,
  shippingCostFar: 20000,
};

/**
 * Resolves a shipping zone estimate from a 4-digit Argentine postal code
 * and the current zone pricing settings. Throws if the input isn't exactly
 * 4 digits once whitespace is stripped.
 */
export function calculateShippingByPostalCode(
  cpInput: string,
  settings: ShippingZoneSettings = DEFAULT_SHIPPING_ZONE_SETTINGS,
): ShippingZoneEstimate {
  const cp = cpInput.replace(/\s+/g, "");

  if (!/^\d{4}$/.test(cp)) {
    throw new Error("Ingresá un código postal válido de 4 números.");
  }

  // Zone 1 (Local): the showroom's own postal code — free shipping / pickup.
  if (cp === settings.localPostalCode) {
    return {
      price: settings.shippingCostLocal,
      message: "Envío gratis o retiro por nuestro showroom.",
      estimatedDays: "24hs",
    };
  }

  const prefix = parseInt(cp.charAt(0), 10);
  const firstTwoDigits = parseInt(cp.slice(0, 2), 10);

  // Zone 2 (Far: North/South): NOA (4), Patagonia (8, 9), and the NEA codes
  // carved out of prefix 3 (33 to 35) — the rest of prefix 3 falls through
  // to Zone 3 below.
  const isNoaOrPatagonia = prefix === 4 || prefix === 8 || prefix === 9;
  const isNea = prefix === 3 && firstTwoDigits >= 33 && firstTwoDigits <= 35;

  if (isNoaOrPatagonia || isNea) {
    return {
      price: settings.shippingCostFar,
      message: "Envío estándar a domicilio (Norte/Sur)",
      estimatedDays: "5 a 8 días hábiles",
    };
  }

  // Zone 3 (Near: Centro/PBA/CABA): everything else (1, 2, 5, 6, 7, and the
  // rest of 3).
  return {
    price: settings.shippingCostNear,
    message: "Envío estándar a domicilio",
    estimatedDays: "3 a 5 días hábiles",
  };
}
