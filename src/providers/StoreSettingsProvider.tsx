"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Shipping/store configuration consumed across the storefront. Mirrors the
 * columns read by `getStoreSettings` (server) 1:1, just camelCased.
 */
export interface StoreSettingsValues {
  /** @deprecated No longer used to compute the checkout total — superseded by the zone-based fields below. */
  freeShippingThreshold: number;
  /** @deprecated See `freeShippingThreshold`. */
  flatShippingRate: number;
  /** Postal code treated as "local" (free shipping / showroom pickup). */
  localPostalCode: string;
  /** Zone 1 (local) shipping cost in ARS. */
  shippingCostLocal: number;
  /** Zone 3 (near: Centro/PBA/CABA) shipping cost in ARS. */
  shippingCostNear: number;
  /** Zone 2 (far: North/South) shipping cost in ARS. */
  shippingCostFar: number;
}

const StoreSettingsContext = createContext<StoreSettingsValues | null>(null);

interface StoreSettingsProviderProps {
  /**
   * Snapshot fetched server-side by `RootLayout` via `getStoreSettings`, so
   * every client component under this provider reads the real,
   * admin-configured values from its very first render. There is no client
   * fetch and no hardcoded-default-then-real-value flash, which also means
   * there is nothing for the server/client first paint to disagree on.
   */
  initialSettings: StoreSettingsValues;
  children: ReactNode;
}

export function StoreSettingsProvider({ initialSettings, children }: StoreSettingsProviderProps) {
  return <StoreSettingsContext.Provider value={initialSettings}>{children}</StoreSettingsContext.Provider>;
}

/**
 * Reads the `store_settings` snapshot provided by `StoreSettingsProvider`.
 * Throws if rendered outside it — every route in this app is a descendant of
 * `RootLayout`, which always provides it, so a missing provider is a wiring
 * bug, not a state to design a silent fallback around.
 */
export function useStoreSettingsContext(): StoreSettingsValues {
  const settings = useContext(StoreSettingsContext);

  if (!settings) {
    throw new Error("useStoreSettingsContext must be used within a StoreSettingsProvider.");
  }

  return settings;
}
