"use client";

import { useState } from "react";
import { Check, Copy, Truck } from "lucide-react";

interface TrackingInfoCardProps {
  trackingNumber: string;
  shippingProvider: string;
}

/**
 * Shown on order detail/confirmation views once an order's status is
 * "shipped". Lets the customer copy the tracking number with one click
 * instead of having to select it manually.
 */
export function TrackingInfoCard({ trackingNumber, shippingProvider }: TrackingInfoCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (e.g. insecure context, permissions) — the
      // number is still visible on screen for manual copying, so this is
      // safe to ignore silently.
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-cairo-accent-blue/40 bg-cairo-accent-blue/10 p-5">
      <div className="flex items-center gap-2 text-cairo-text">
        <Truck className="h-4 w-4" />
        <p className="text-sm font-medium">Tu pedido está en camino</p>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-cairo-text/50">Empresa de envío</dt>
          <dd className="mt-0.5 text-cairo-text">{shippingProvider}</dd>
        </div>
        <div>
          <dt className="text-cairo-text/50">Número de seguimiento</dt>
          <dd className="mt-0.5 flex items-center gap-2 text-cairo-text">
            <span className="font-mono">{trackingNumber}</span>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copiar número de seguimiento"
              className="text-cairo-text/50 transition-colors hover:text-cairo-primary"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </dd>
        </div>
      </dl>
    </div>
  );
}
