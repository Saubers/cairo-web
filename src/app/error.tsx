"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Catches render/runtime errors thrown by any
 * Server or Client Component rendered under this `app/` root's `<main>`
 * (everything except the root `layout.tsx` itself and components rendered
 * directly inside it, like `<Navbar />` — those are only caught by
 * `global-error.tsx`). Must be a Client Component per Next.js convention.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Never show the raw stack trace to the customer — log it for
    // diagnostics only (picked up by the hosting platform's server logs).
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-cairo-bg px-4 py-24 text-center text-cairo-text">
      <p className="font-heading text-sm uppercase tracking-widest text-cairo-text/50">
        Algo salió mal
      </p>
      <h1 className="mt-4 font-heading text-3xl">
        Ocurrió un error inesperado
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-cairo-text/70">
        Ya estamos al tanto. Podés intentar de nuevo o volver al inicio
        mientras lo resolvemos.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="rounded-full bg-cairo-primary px-6 py-3 text-sm font-medium text-cairo-bg transition-opacity hover:opacity-90"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="rounded-full border border-cairo-text/20 px-6 py-3 text-sm font-medium transition-colors hover:bg-cairo-text/5"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
