import Link from "next/link";

/**
 * Global 404 boundary. Next.js renders this automatically whenever
 * `notFound()` is called or a route segment simply doesn't match anything,
 * for every route under this `app/` root that doesn't define its own
 * `not-found.tsx`. Kept as a Server Component since it has no interactivity.
 */
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-cairo-bg px-4 py-24 text-center text-cairo-text">
      <p className="font-heading text-sm uppercase tracking-widest text-cairo-text/50">
        Error 404
      </p>
      <h1 className="mt-4 font-heading text-3xl">Esta página no existe</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-cairo-text/70">
        El enlace puede estar roto o la página puede haber sido movida.
        Volvé al inicio para seguir explorando Cairo.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-cairo-primary px-6 py-3 text-sm font-medium text-cairo-bg transition-opacity hover:opacity-90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
