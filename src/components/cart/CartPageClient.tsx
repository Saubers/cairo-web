"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { checkoutSchema, type CheckoutFormValues } from "@/lib/validation/checkoutSchema";
import { GuestCheckoutModal } from "@/components/cart/GuestCheckoutModal";
import { CartSummary } from "@/components/cart/CartSummary";
import { Spinner } from "@/components/ui/Spinner";

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

interface CheckoutSuccessResponse {
  initPoint: string;
}

function isCheckoutSuccessResponse(value: unknown): value is CheckoutSuccessResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { initPoint?: unknown }).initPoint === "string"
  );
}

// Shared input styling for the checkout form fields.
const INPUT_CLASS =
  "rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary";

interface CartPageClientProps {
  /** Resolved server-side by the `page.tsx` Server Component wrapper, so the soft-gate never flashes before auth state is known. */
  isLoggedIn: boolean;
}

/**
 * Interactive cart + checkout UI. Split out of `page.tsx` so the parent can
 * resolve auth state server-side (via Supabase cookies) and hand it down
 * here, mirroring the `Navbar`/`NavbarClient` pattern.
 *
 * Implements "soft-gating": logged-in users go straight to the contact/
 * shipping form, while guests first see `GuestCheckoutModal` recommending
 * login/register, with "Continuar como invitado" as an always-available
 * escape hatch that reveals the same form inline.
 */
export function CartPageClient({ isLoggedIn }: CartPageClientProps) {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  // Before rehydration completes, `items` is always `[]` (the store's
  // in-memory initial state) — rendering the "empty cart" message at that
  // point would incorrectly flash for a returning visitor who actually has
  // items in a previous session's cart.
  const hasHydrated = useCartStore((state) => state.hasHydrated);

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [mercadoPagoInitPoint, setMercadoPagoInitPoint] = useState<string | null>(null);

  // Soft-gating state: logged-in users skip the gate entirely; guests must
  // either log in/register or explicitly choose to continue as a guest
  // before the contact/shipping form (and real submit button) appear.
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [hasPassedGate, setHasPassedGate] = useState(isLoggedIn);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({ resolver: zodResolver(checkoutSchema) });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Redirecting to Mercado Pago is a side effect outside React's render/event
  // model, so — consistent with the login/logout "nuclear" navigation
  // pattern elsewhere in the app — it's pushed into an effect rather than
  // mutating `window.location` directly inside the submit handler.
  useEffect(() => {
    if (mercadoPagoInitPoint) {
      window.location.href = mercadoPagoInitPoint;
    }
  }, [mercadoPagoInitPoint]);

  function handleProceedClick(): void {
    if (isLoggedIn) {
      setHasPassedGate(true);
      return;
    }

    setIsGuestModalOpen(true);
  }

  function handleContinueAsGuest(): void {
    setIsGuestModalOpen(false);
    setHasPassedGate(true);
  }

  async function onSubmit(values: CheckoutFormValues): Promise<void> {
    setCheckoutError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          contact: values,
        }),
      });

      // Only parse as JSON if the server actually says it sent JSON. A crash
      // in the Route Handler (e.g. a missing env var, an uncaught exception
      // on the edge runtime) can come back with an empty body or an HTML
      // error page — calling `.json()` on that throws "Unexpected end of
      // JSON input", which is confusing to catch and impossible to show the
      // user anything useful about. Reading it as text first lets us surface
      // a real (if generic) message in every case instead.
      const contentType = response.headers.get("content-type") ?? "";
      const isJsonResponse = contentType.includes("application/json");

      if (!response.ok || !isJsonResponse) {
        const rawText = await response.text();
        console.error("Checkout request failed:", response.status, rawText);
        throw new Error("No pudimos iniciar el pago. Intentá nuevamente.");
      }

      const body: unknown = await response.json();

      if (!isCheckoutSuccessResponse(body)) {
        const message =
          typeof body === "object" && body !== null && typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : "No pudimos iniciar el pago. Intentá nuevamente.";
        throw new Error(message);
      }

      setMercadoPagoInitPoint(body.initPoint);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos iniciar el pago. Intentá nuevamente.";
      setCheckoutError(message);
    }
  }

  if (!hasHydrated) {
    return <div className="min-h-[70vh]" />;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="font-heading text-2xl text-cairo-text">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-cairo-text/60">
          Todavía no agregaste productos. Descubrí nuestras colecciones y encontrá algo que te encante.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-md bg-cairo-primary px-6 py-2 text-sm font-medium text-cairo-bg transition-opacity hover:opacity-90"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-heading text-3xl text-cairo-text">Tu carrito</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]"
      >
        <ul className="space-y-6">
          {items.map((item) => (
            <li
              key={item.productId}
              className="flex items-center gap-4 border-b border-cairo-text/10 pb-6"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-cairo-accent-yellow/40">
                {item.imageUrl && (
                  <Image src={item.imageUrl} alt={item.name} fill sizes="80px" className="object-cover" />
                )}
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium text-cairo-text">{item.name}</p>
                <p className="mt-1 text-sm text-cairo-text/60">{PRICE_FORMATTER.format(item.price)}</p>

                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-cairo-text/20 text-cairo-text transition-colors hover:border-cairo-primary hover:text-cairo-primary"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm text-cairo-text">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-cairo-text/20 text-cairo-text transition-colors hover:border-cairo-primary hover:text-cairo-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <p className="text-sm font-medium text-cairo-text">
                  {PRICE_FORMATTER.format(item.price * item.quantity)}
                </p>
                <button
                  type="button"
                  aria-label="Remove item"
                  onClick={() => removeItem(item.productId)}
                  className="text-cairo-text/50 transition-colors hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <aside className="space-y-6">
          {hasPassedGate ? (
            <>
              {/* Contact & billing section */}
              <div className="space-y-3 rounded-md border border-cairo-text/10 p-5">
                <h2 className="font-heading text-lg text-cairo-text">Contacto y facturación</h2>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    {...register("guestEmail")}
                    className={`col-span-2 ${INPUT_CLASS}`}
                  />
                  {errors.guestEmail && (
                    <p className="col-span-2 text-xs text-red-600">{errors.guestEmail.message}</p>
                  )}

                  <input
                    type="text"
                    placeholder="Nombre completo"
                    autoComplete="name"
                    {...register("guestName")}
                    className={`col-span-2 ${INPUT_CLASS}`}
                  />
                  {errors.guestName && (
                    <p className="col-span-2 text-xs text-red-600">{errors.guestName.message}</p>
                  )}

                  <input
                    type="text"
                    placeholder="Teléfono"
                    autoComplete="tel"
                    {...register("guestPhone")}
                    className={INPUT_CLASS}
                  />
                  {errors.guestPhone && <p className="text-xs text-red-600">{errors.guestPhone.message}</p>}

                  <input
                    type="text"
                    placeholder="DNI/CUIL"
                    inputMode="numeric"
                    {...register("guestDni")}
                    className={INPUT_CLASS}
                  />
                  {errors.guestDni && <p className="text-xs text-red-600">{errors.guestDni.message}</p>}
                </div>
              </div>

              {/* Shipping address section */}
              <div className="space-y-3 rounded-md border border-cairo-text/10 p-5">
                <h2 className="font-heading text-lg text-cairo-text">Dirección de envío</h2>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Calle"
                    {...register("guestAddressStreet")}
                    className={`col-span-2 ${INPUT_CLASS}`}
                  />
                  {errors.guestAddressStreet && (
                    <p className="col-span-2 text-xs text-red-600">{errors.guestAddressStreet.message}</p>
                  )}

                  <input
                    type="text"
                    placeholder="Altura"
                    {...register("guestAddressNumber")}
                    className={INPUT_CLASS}
                  />
                  {errors.guestAddressNumber && (
                    <p className="text-xs text-red-600">{errors.guestAddressNumber.message}</p>
                  )}

                  <input
                    type="text"
                    placeholder="Piso/Depto (opcional)"
                    {...register("guestAddressFloorApt")}
                    className={INPUT_CLASS}
                  />

                  <input
                    type="text"
                    placeholder="Código postal"
                    {...register("guestAddressZip")}
                    className={INPUT_CLASS}
                  />
                  {errors.guestAddressZip && (
                    <p className="text-xs text-red-600">{errors.guestAddressZip.message}</p>
                  )}

                  <input
                    type="text"
                    placeholder="Provincia"
                    {...register("guestAddressState")}
                    className={INPUT_CLASS}
                  />
                  {errors.guestAddressState && (
                    <p className="text-xs text-red-600">{errors.guestAddressState.message}</p>
                  )}

                  <input
                    type="text"
                    placeholder="Localidad"
                    {...register("guestAddressCity")}
                    className={`col-span-2 ${INPUT_CLASS}`}
                  />
                  {errors.guestAddressCity && (
                    <p className="col-span-2 text-xs text-red-600">{errors.guestAddressCity.message}</p>
                  )}
                </div>
              </div>

              <CartSummary subtotal={subtotal}>
                {checkoutError && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{checkoutError}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || mercadoPagoInitPoint !== null}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-cairo-primary px-4 py-2 text-sm font-medium text-cairo-bg transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting || mercadoPagoInitPoint ? (
                    <>
                      <Spinner className="h-5 w-5 border-2" />
                      Redirigiendo a Mercado Pago...
                    </>
                  ) : (
                    "Proceder al Pago"
                  )}
                </button>
              </CartSummary>
            </>
          ) : (
            // Pre-gate summary: guests see the subtotal/shipping/total and a
            // CTA that opens `GuestCheckoutModal` instead of the contact/
            // shipping form directly.
            <CartSummary subtotal={subtotal}>
              <button
                type="button"
                onClick={handleProceedClick}
                className="w-full rounded-md bg-cairo-primary px-4 py-2 text-sm font-medium text-cairo-bg transition-opacity hover:opacity-90"
              >
                Proceder al Pago
              </button>
            </CartSummary>
          )}
        </aside>
      </form>

      <GuestCheckoutModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onContinueAsGuest={handleContinueAsGuest}
      />
    </div>
  );
}
