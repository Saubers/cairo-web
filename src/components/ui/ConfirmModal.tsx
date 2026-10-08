"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Shows a spinner on the confirm button and disables both buttons while the action runs. */
  isLoading?: boolean;
  /** "destructive" (red confirm button) is the default — this modal is mostly used for deletes. */
  variant?: "destructive" | "default";
}

/**
 * Reusable confirmation dialog replacing native `window.confirm`/`alert`.
 * Rendered through a portal into `document.body` so it can be mounted from
 * anywhere — including inside a `<td>`, where a `fixed`-positioned `<div>`
 * would otherwise be invalid HTML.
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isLoading = false,
  variant = "destructive",
}: ConfirmModalProps) {
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

  // `document` only exists on the client. This component's content is only
  // ever shown after a user interaction (well after hydration), so the
  // modal is always closed on first render — there's nothing for the server
  // and the client's first render to disagree on here.
  if (typeof document === "undefined") return null;

  const confirmButtonClass =
    variant === "destructive"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-cairo-primary hover:opacity-90";

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
            aria-labelledby="confirm-modal-title"
            className="w-full max-w-sm rounded-lg bg-cairo-bg p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <h2 id="confirm-modal-title" className="font-heading text-lg text-cairo-text">
              {title}
            </h2>
            <p className="mt-2 text-sm text-cairo-text/70">{message}</p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="rounded-md border border-cairo-text/20 px-4 py-2 text-sm font-medium text-cairo-text/70 transition-all duration-200 ease-in-out hover:text-cairo-text disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-in-out disabled:opacity-50 ${confirmButtonClass}`}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
