"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export interface GuestCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when the user picks "Continuar como invitado" — the caller closes the modal and reveals the guest contact/shipping form. */
  onContinueAsGuest: () => void;
}

/**
 * Soft-gating modal shown when an unauthenticated user tries to proceed to
 * payment from the cart. Recommends logging in (faster checkout, order
 * tracking, exclusive offers) while always leaving a clear guest escape
 * hatch — never blocks the purchase.
 *
 * Mirrors `ConfirmModal`'s portal/overlay/scroll-lock conventions so both
 * modals in the app behave and feel identical.
 */
export function GuestCheckoutModal({ isOpen, onClose, onContinueAsGuest }: GuestCheckoutModalProps) {
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
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // `document` only exists on the client. This modal is only ever opened
  // after a user interaction (well after hydration), so there's nothing for
  // the server and the client's first render to disagree on here.
  if (typeof document === "undefined") return null;

  return createPortal(
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
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-checkout-modal-title"
            className="relative w-full max-w-md rounded-xl bg-cairo-bg p-6 shadow-xl sm:p-8"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-4 top-4 text-cairo-text/50 transition-colors hover:text-cairo-text"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 id="guest-checkout-modal-title" className="font-heading text-2xl text-cairo-text">
              Finalizá tu compra
            </h2>

            {/* Primary section: recommends creating an account / logging in */}
            <div className="mt-4">
              <p className="text-sm text-cairo-text/70">
                Iniciá sesión para un pago más rápido, seguimiento de tus pedidos y acceso a ofertas exclusivas.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Link
                  href="/auth/login?redirect=/carrito"
                  className="flex items-center justify-center rounded-md bg-cairo-primary px-4 py-3 text-sm font-medium text-cairo-bg transition-opacity hover:opacity-90"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/auth/register?redirect=/carrito"
                  className="flex items-center justify-center rounded-md border border-cairo-text/20 px-4 py-3 text-sm font-medium text-cairo-text transition-colors hover:border-cairo-primary hover:text-cairo-primary"
                >
                  Crear cuenta
                </Link>
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <hr className="border-cairo-text/10" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-cairo-bg px-3 text-xs text-cairo-text/50">
                O
              </span>
            </div>

            {/* Secondary section: continue as guest */}
            <div>
              <p className="text-sm text-cairo-text/70">
                Podés continuar sin cuenta. Solo te pediremos un email para enviarte el comprobante y los datos de
                envío.
              </p>

              <button
                type="button"
                onClick={onContinueAsGuest}
                className="mt-3 w-full py-2 text-center text-sm font-medium text-cairo-text/70 underline underline-offset-2 transition-colors hover:text-cairo-text"
              >
                Continuar como invitado
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
