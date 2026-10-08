import Link from "next/link";
import Image from "next/image";
import { getActiveCollections } from "@/services/collectionService";

// Server Component: queries active collections directly from Supabase on
// every request, replacing the old static/hardcoded collection list.
export default async function ColeccionesPage() {
  const collections = await getActiveCollections();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cairo-text/50">Cairo</p>
        <h1 className="mt-2 font-heading text-4xl text-cairo-text">Colecciones</h1>
      </div>

      {collections.length > 0 ? (
        <div className="mt-12 space-y-8">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/colecciones/${collection.slug}`}
              className="group relative flex h-56 flex-col items-start justify-center overflow-hidden rounded-xl bg-cairo-accent-yellow/40 px-8 transition-transform duration-300 hover:-translate-y-1 sm:h-64 sm:px-12"
            >
              {collection.imageUrl && (
                <Image
                  src={collection.imageUrl}
                  alt={collection.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              {/* Gradient overlay guarantees text legibility over any cover image. */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              <div className="relative z-10">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">
                  Colección
                </p>
                <h2 className="mt-2 font-heading text-3xl text-white">{collection.name}</h2>
                {collection.description && (
                  <p className="mt-3 max-w-md text-sm text-white/80">{collection.description}</p>
                )}
                <span className="mt-5 inline-block text-sm font-semibold text-white underline-offset-4 group-hover:underline">
                  Ver colección
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-16 text-center">
          <p className="text-sm text-cairo-text/60">
            Todavía no hay colecciones disponibles. Mientras tanto, descubrí todo nuestro catálogo.
          </p>
          <Link
            href="/catalogo"
            className="mt-4 inline-block text-sm font-semibold text-cairo-primary underline-offset-4 hover:underline"
          >
            Ver catálogo completo
          </Link>
        </div>
      )}
    </div>
  );
}
