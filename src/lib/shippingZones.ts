/**
 * Postal-code-based shipping zone estimator, shown to shoppers as a rough
 * quote before checkout (e.g. from a "calculate shipping" modal on the
 * product detail page). This is intentionally separate from
 * `calculateShipping` in `src/lib/shipping.ts`, which computes the actual
 * flat-rate cost charged at checkout from the cart subtotal and
 * `store_settings` — that one name was already taken by a live,
 * checkout-critical function, so this zone estimator uses a distinct name
 * to avoid any risk of colliding with it.
 *
 * No external carrier API (e.g. Andreani) is used here — zones are inferred
 * entirely from the first digit(s) of the Argentine postal code (CPA).
 */

export interface ShippingZoneEstimate {
  /** Shipping cost in ARS. `0` means free. */
  price: number;
  /** Human-readable description of the shipping method for this zone. */
  message: string;
  /** Human-readable estimated delivery window. */
  estimatedDays: string;
}

/** Local showroom postal code: free shipping / pickup in person. */
const LOCAL_POSTAL_CODE = "2930";

/** Far zone flat rate (NOA, Patagonia, and the NEA codes carved out of prefix 3). */
const FAR_ZONE_ESTIMATE: ShippingZoneEstimate = {
  price: 20000,
  message: "Envío estándar a domicilio (Norte/Sur)",
  estimatedDays: "5 a 8 días hábiles",
};

/** Near zone flat rate (Centro, PBA, CABA, and the rest of prefix 3). */
const NEAR_ZONE_ESTIMATE: ShippingZoneEstimate = {
  price: 15000,
  message: "Envío estándar a domicilio",
  estimatedDays: "3 a 5 días hábiles",
};

/**
 * Resolves a shipping zone estimate from a 4-digit Argentine postal code.
 * Throws if the input isn't exactly 4 digits once whitespace is stripped.
 */
export function calculateShippingByPostalCode(cpInput: string): ShippingZoneEstimate {
  const cp = cpInput.replace(/\s+/g, "");

  if (!/^\d{4}$/.test(cp)) {
    throw new Error("Ingresá un código postal válido de 4 números.");
  }

  // Zone 1 (Local): the showroom's own postal code — free shipping / pickup.
  if (cp === LOCAL_POSTAL_CODE) {
    return {
      price: 0,
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
    return FAR_ZONE_ESTIMATE;
  }

  // Zone 3 (Near: Centro/PBA/CABA): everything else (1, 2, 5, 6, 7, and the
  // rest of 3).
  return NEAR_ZONE_ESTIMATE;
}
