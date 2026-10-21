"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Truck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { calculateShippingByPostalCode, type ShippingZoneEstimate } from "@/lib/shippingZones";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useIsMounted } from "@/hooks/useIsMounted";

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** Device-local fallback for guests with no Supabase session. */
const LOCAL_STORAGE_KEY = "cairo_user_cp";

/**
 * Trigger + modal that lets a shopper estimate shipping cost and delivery
 * time from their postal code, without leaving the product page. Pricing is
 * computed entirely client-side from `shippingZones.ts` — no network request
 * involved for the calculation itself.
 *
 * The postal code is persisted hybrid-style so it "follows" the shopper
 * across products without them having to re-open this modal every time:
 * - Always written to `localStorage` (works for guests too).
 * - Also synced to Supabase `user_metadata` when a session exists, so it
 *   follows a logged-in shopper across devices.
 * On mount, the account's saved postal code wins over the local one — it's
 * the more durable, cross-device source of truth.
 */
export function ShippingCalculator() {
  // Guards against a hydration mismatch: the saved postal code can only be
  // read from the browser (localStorage / Supabase session) after mount, so
  // the inline summary below is only rendered once mounted — both the server
  // and the client's first paint render the plain trigger button instead.
  const isMounted = useIsMounted();

  const [isOpen, setIsOpen] = useState(false);
  const [postalCode, setPostalCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  // The postal code a persisted estimate belongs to. Unlike `postalCode`
  // (the live modal input), this represents the persisted result and must
  // survive the modal being closed.
  const [confirmedCp, setConfirmedCp] = useState<string | null>(null);

  // Live `store_settings` zone pricing — read here so the estimate below
  // always reflects whatever an admin has configured on `/admin/configuracion`,
  // not hardcoded prices.
  const { localPostalCode, shippingCostLocal, shippingCostNear, shippingCostFar } = useStoreSettings();

  // Pure derivation from `confirmedCp` + the live zone settings, recomputed
  // on every render where either changes — e.g. once `useStoreSettings`'s
  // own fetch resolves with the real admin-configured prices. Not stored in
  // its own `useState`/`useEffect` pair: it has no identity of its own
  // beyond these two inputs, so syncing it via an effect would just be an
  // unnecessary extra render.
  const estimate = useMemo<ShippingZoneEstimate | null>(() => {
    if (!confirmedCp) return null;

    try {
      return calculateShippingByPostalCode(confirmedCp, {
        localPostalCode,
        shippingCostLocal,
        shippingCostNear,
        shippingCostFar,
      });
    } catch {
      // `confirmedCp` is no longer a valid 4-digit CP (e.g. corrupted
      // storage) — the plain "Calcular envío" trigger is a safe fallback.
      return null;
    }
  }, [confirmedCp, localPostalCode, shippingCostLocal, shippingCostNear, shippingCostFar]);

  // On mount, try to restore a previously saved postal code: the Supabase
  // account's metadata takes priority over the device-local fallback, since
  // it follows the shopper across devices.
  useEffect(() => {
    async function restoreSavedPostalCode(): Promise<void> {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accountCp = session?.user.user_metadata?.postal_code as string | undefined;
        const savedCp = accountCp ?? localStorage.getItem(LOCAL_STORAGE_KEY) ?? undefined;

        if (savedCp) {
          setConfirmedCp(savedCp);
        }
      } catch {
        // Session lookup failed — ignore it silently, the plain
        // "Calcular envío" trigger is still a safe fallback.
      }
    }

    restoreSavedPostalCode();
  }, []);

  function handleOpen(): void {
    // Pre-fill with the currently confirmed postal code when reopening to
    // change it; starts blank the first time, when nothing is saved yet.
    setPostalCode(confirmedCp ?? "");
    setError(null);
    setIsOpen(true);
  }

  function handleClose(): void {
    setIsOpen(false);
    setError(null);
    // `confirmedCp` is intentionally NOT reset here — it's the persisted
    // result (which derives `estimate`, see the `useMemo` above) and must
    // remain visible after the modal closes.
  }

  // Lock background scroll while the modal is open.
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") handleClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  async function handleCalculate(): Promise<void> {
    try {
      // Validates the CP up front so an invalid format shows an inline
      // error instead of silently setting `confirmedCp` — the `estimate`
      // itself is derived by the `useMemo` above once `confirmedCp` is set,
      // so it always uses the latest `store_settings` prices.
      calculateShippingByPostalCode(postalCode, {
        localPostalCode,
        shippingCostLocal,
        shippingCostNear,
        shippingCostFar,
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Ingresá un código postal válido de 4 números.";
      setError(message);
      setConfirmedCp(null);
      return;
    }

    setConfirmedCp(postalCode);
    setError(null);

    // Always persist locally — this alone is enough for guest shoppers to
    // keep their estimate across products and page loads.
    localStorage.setItem(LOCAL_STORAGE_KEY, postalCode);

    // Logged-in shoppers additionally get it synced to their account
    // metadata so it follows them across devices. Best-effort: a failure
    // here doesn't affect the estimate already shown above.
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await supabase.auth.updateUser({ data: { postal_code: postalCode } });
      }
    } catch (updateError) {
      console.error("[ShippingCalculator] Failed to sync postal code to account metadata:", updateError);
    }
  }

  function handlePostalCodeChange(value: string): void {
    // Numeric-only input, capped at 4 digits (Argentine postal codes).
    setPostalCode(value.replace(/\D/g, "").slice(0, 4));
    setError(null);
  }

  // Only trust the restored/confirmed estimate for the non-invasive inline
  // summary once mounted, to avoid a server/client render mismatch.
  const hasSavedEstimate = isMounted && estimate !== null && confirmedCp !== null;

  return (
    <>
      {hasSavedEstimate ? (
        // Non-invasive inline result: no more need to re-open the modal on
        // every product page once a postal code has been calculated once.
        <div className="flex flex-wrap items-center gap-2 text-sm text-cairo-text">
          <span className="flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-cairo-text/50" />
            Envío a CP {confirmedCp}:{" "}
            <span className="font-semibold text-cairo-primary">
              {estimate!.price === 0 ? "Gratis" : PRICE_FORMATTER.format(estimate!.price)}
            </span>
          </span>
          <button
            type="button"
            onClick={handleOpen}
            className="text-xs font-medium text-cairo-text/60 underline-offset-2 transition-all duration-200 ease-in-out hover:text-cairo-primary hover:underline"
          >
            Cambiar CP
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="flex items-center gap-2 text-sm font-medium text-cairo-text underline-offset-4 transition-all duration-200 ease-in-out hover:text-cairo-primary hover:underline"
        >
          <Truck className="h-4 w-4" />
          Calcular envío
        </button>
      )}

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
                onClick={(event) => {
                  // Close only when the backdrop itself (not the dialog) is clicked.
                  if (event.target === event.currentTarget) handleClose();
                }}
              >
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="shipping-calculator-title"
                  className="w-full max-w-sm rounded-lg bg-cairo-bg p-6 shadow-xl"
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <div className="flex items-start justify-between">
                    <h2
                      id="shipping-calculator-title"
                      className="font-heading text-lg text-cairo-text"
                    >
                      Calculá tu envío
                    </h2>
                    <button
                      type="button"
                      onClick={handleClose}
                      aria-label="Cerrar"
                      className="rounded-full p-1 text-cairo-text/50 transition-all duration-200 ease-in-out hover:bg-cairo-text/10 hover:text-cairo-text"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <p className="mt-2 text-sm text-cairo-text/70">
                    Ingresá tu código postal para ver el costo y tiempo de entrega estimado.
                  </p>

                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={postalCode}
                      onChange={(event) => handlePostalCodeChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleCalculate();
                      }}
                      placeholder="Ej: 1425"
                      aria-label="Código postal"
                      className="w-full rounded-md border border-cairo-text/20 bg-white px-3 py-2 text-sm text-cairo-text outline-none transition-all duration-200 ease-in-out focus:border-cairo-primary"
                    />
                    <button
                      type="button"
                      onClick={handleCalculate}
                      disabled={postalCode.length !== 4}
                      className="shrink-0 rounded-md bg-cairo-primary px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-in-out hover:opacity-90 disabled:opacity-50"
                    >
                      Calcular
                    </button>
                  </div>

                  {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

                  {estimate && confirmedCp === postalCode && (
                    <div className="mt-4 rounded-md border border-cairo-text/10 bg-cairo-accent-yellow p-4">
                      <p className="text-sm text-cairo-text">{estimate.message}</p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-lg font-semibold text-cairo-primary">
                          {estimate.price === 0 ? "Gratis" : PRICE_FORMATTER.format(estimate.price)}
                        </span>
                        <span className="text-sm text-cairo-text/70">{estimate.estimatedDays}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
