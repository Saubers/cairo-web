"use client";

import type { ReactNode } from "react";
import { calculateShipping } from "@/lib/shipping";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

interface CartSummaryProps {
  subtotal: number;
  /** Button/error-message area, which differs between the pre-gate and post-gate cart views. */
  children?: ReactNode;
}

/**
 * Shared cart summary: subtotal, flat-rate/free shipping row, a free-shipping
 * progress indicator, and the final total. Reused by both the pre-gate and
 * post-gate views in `CartPageClient`, which only differ in the CTA/error
 * area passed in as `children`.
 *
 * Shipping config comes from `useStoreSettings` (live `store_settings` row)
 * rather than hardcoded constants, so this preview always matches what
 * `/api/checkout` actually charges.
 */
export function CartSummary({ subtotal, children }: CartSummaryProps) {
  const { freeShippingThreshold, flatShippingRate } = useStoreSettings();
  const shipping = calculateShipping(subtotal, freeShippingThreshold, flatShippingRate);
  const progressPercent = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  return (
    <div className="space-y-4 rounded-md border border-cairo-text/10 p-5">
      <div>
        {shipping.isFree ? (
          <p className="text-sm font-medium text-cairo-primary">¡Felicitaciones! Tenés envío gratis.</p>
        ) : (
          <>
            <p className="text-sm text-cairo-text/70">
              ¡Te faltan {PRICE_FORMATTER.format(shipping.remainingForFreeShipping)} para tener envío gratis!
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cairo-text/10">
              <div
                className="h-full rounded-full bg-cairo-primary transition-all duration-300 ease-in-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </>
        )}
      </div>

      <div className="space-y-2 border-t border-cairo-text/10 pt-4">
        <div className="flex items-center justify-between text-sm text-cairo-text/60">
          <span>Subtotal</span>
          <span>{PRICE_FORMATTER.format(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-cairo-text/60">
          <span>Envío a domicilio</span>
          <span>{shipping.isFree ? "Gratis" : PRICE_FORMATTER.format(shipping.cost)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-cairo-text/60">Total</span>
          <span className="font-heading text-xl text-cairo-text">{PRICE_FORMATTER.format(shipping.total)}</span>
        </div>
      </div>

      {children}
    </div>
  );
}
