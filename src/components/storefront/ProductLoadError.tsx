import Link from "next/link";

/**
 * Friendly fallback rendered by the product detail page's Server Component
 * when fetching the product itself throws (as opposed to a legitimate
 * "not found", which uses `notFound()` instead). Plain Server Component —
 * no interactivity, so no `"use client"` needed.
 */
export function ProductLoadError() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-3 px-4 py-24 text-center sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl text-cairo-text">No pudimos cargar este producto</h1>
      <p className="max-w-md text-sm text-cairo-text/60">
        Ocurrió un error inesperado al traer la información de este producto. Probá de nuevo en unos minutos.
      </p>
      <Link
        href="/catalogo"
        className="mt-2 rounded-md bg-cairo-primary px-5 py-2 text-sm font-medium text-cairo-bg transition-opacity hover:opacity-90"
      >
        Volver al catálogo
      </Link>
    </div>
  );
}
