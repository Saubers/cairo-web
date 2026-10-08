import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCollectionBySlug } from "@/services/collectionService";
import { getProducts } from "@/services/productService";
import { ProductCard } from "@/components/storefront/ProductCard";

/** Fallback description for collections with no `description` set, used in metadata. */
const DEFAULT_COLLECTION_DESCRIPTION = "Descubrí esta colección de Cairo.";

/**
 * Dynamic per-collection metadata, mirroring the pattern used for product
 * detail pages (see `/producto/[id]/page.tsx`). Inactive/missing collections
 * fall back to a generic title instead of throwing, since `generateMetadata`
 * runs independently of the page body's own `notFound()` check.
 */
export async function generateMetadata(
  props: PageProps<"/colecciones/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const collection = await getCollectionBySlug(slug);

  if (!collection || !collection.isActive) {
    return { title: "Colección no encontrada" };
  }

  const title = collection.name;
  const description = collection.description ?? DEFAULT_COLLECTION_DESCRIPTION;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: collection.imageUrl ? [{ url: collection.imageUrl }] : undefined,
    },
  };
}

/**
 * Collection detail page. Server Component: resolves the collection by
 * slug, 404s explicitly when it's missing or inactive (RLS alone would let
 * an admin session read an inactive row, so the active check happens here
 * too — see `getCollectionBySlug`'s JSDoc), then lists the collection's
 * active products reusing the same `ProductCard` grid as `/catalogo`.
 */
export default async function CollectionDetailPage(props: PageProps<"/colecciones/[slug]">) {
  const { slug } = await props.params;
  const collection = await getCollectionBySlug(slug);

  if (!collection || !collection.isActive) {
    notFound();
  }

  const { data: products } = await getProducts({ collectionId: collection.id });

  return (
    <div>
      <div className="relative flex h-64 items-end overflow-hidden bg-cairo-accent-yellow/40 sm:h-80">
        {collection.imageUrl && (
          <Image src={collection.imageUrl} alt={collection.name} fill className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">Colección</p>
          <h1 className="mt-2 font-heading text-4xl text-white">{collection.name}</h1>
          {collection.description && (
            <p className="mt-3 max-w-xl text-sm text-white/80">{collection.description}</p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-cairo-text/60">
              Todavía no hay productos asignados a esta colección. Mientras tanto, descubrí todo
              nuestro catálogo.
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
    </div>
  );
}
