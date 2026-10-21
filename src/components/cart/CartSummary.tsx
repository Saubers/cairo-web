"use client";

import type { ReactNode } from "react";
import { calculateShippingByPostalCode } from "@/lib/shippingZones";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

interface CartSummaryProps {
  subtotal: number;
  /**
   * The shipping address postal code as currently typed in the checkout
   * form, live. `undefined`/not-4-digits (e.g. before the gate is passed,
   * or while the field is still empty/incomplete) means the shipping cost
   * isn't known yet — shown as "a calcular" instead of a number.
   */
  postalCode?: string;
  /** Button/error-message area, which differs between the pre-gate and post-gate cart views. */
  children?: ReactNode;
}

/**
 * Shared cart summary: subtotal, postal-code-based shipping row, and the
 * final total. Reused by both the pre-gate and post-gate views in
 * `CartPageClient`, which only differ in the CTA/error area passed in as
 * `children` and in whether a `postalCode` is available yet.
 *
 * Shipping pricing comes from `useStoreSettings` (live `store_settings`
 * row) via `calculateShippingByPostalCode`, so this preview always matches
 * what `/api/checkout` actually charges once a valid postal code is typed.
 */
export function CartSummary({ subtotal, postalCode, children }: CartSummaryProps) {
  const { localPostalCode, shippingCostLocal, shippingCostNear, shippingCostFar } = useStoreSettings();

  // `calculateShippingByPostalCode` throws on anything that isn't exactly 4
  // digits — treated here as "not known yet" rather than an error, since
  // the shopper is likely still typing.
  let shippingCost: number | null = null;
  let shippingMessage: string | null = null;

  if (postalCode) {
    try {
      const estimate = calculateShippingByPostalCode(postalCode, {
        localPostalCode,
        shippingCostLocal,
        shippingCostNear,
        shippingCostFar,
      });
      shippingCost = estimate.price;
      shippingMessage = estimate.message;
    } catch {
      // Incomplete/invalid postal code — fall through, keep showing "a calcular".
    }
  }

  const total = subtotal + (shippingCost ?? 0);

  return (
    <div className="space-y-4 rounded-md border border-cairo-text/10 p-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-cairo-text/60">
          <span>Subtotal</span>
          <span>{PRICE_FORMATTER.format(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-cairo-text/60">
          <span>Envío a domicilio</span>
          <span>
            {shippingCost === null
              ? "A calcular"
              : shippingCost === 0
                ? "Gratis"
                : PRICE_FORMATTER.format(shippingCost)}
          </span>
        </div>
        {shippingMessage && <p className="text-xs text-cairo-text/50">{shippingMessage}</p>}
        {shippingCost === null && (
          <p className="text-xs text-cairo-text/50">Ingresá tu código postal para calcular el envío.</p>
        )}

        <div className="flex items-center justify-between border-t border-cairo-text/10 pt-2">
          <span className="text-sm text-cairo-text/60">Total</span>
          <span className="font-heading text-xl text-cairo-text">
            {PRICE_FORMATTER.format(total)}
            {shippingCost === null && <span className="ml-1 text-xs text-cairo-text/50">+ envío</span>}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}
