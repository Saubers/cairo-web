import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductById } from "@/services/productService";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { ProductQuantityAddToCart } from "@/components/storefront/ProductQuantityAddToCart";
import { calculateDiscountedPrice } from "@/lib/utils";

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** Fallback description for products with no `description` set, used in metadata. */
const DEFAULT_PRODUCT_DESCRIPTION = "Carteras, minibags, totebags y collares. Envíos a todo Argentina.";

/**
 * Dynamic per-product metadata, including Open Graph `images`, so sharing a
 * product link on WhatsApp/Instagram previews the product's name, a short
 * description, and its first photo instead of the generic site card.
 */
export async function generateMetadata(
  props: PageProps<"/producto/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const product = await getProductById(id);

  if (!product) {
    return { title: "Producto no encontrado" };
  }

  // `title` is combined with the `template` set in the root layout
  // ("%s | Cairo"), so this resolves to "<product name> | Cairo".
  const title = product.name;
  const description = product.description ?? DEFAULT_PRODUCT_DESCRIPTION;
  const image = product.imageUrls[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

/**
 * Product detail page. Server Component: product data is fetched directly
 * from Supabase (RLS-governed, public read of active products) so the page
 * is fully server-rendered and crawlable. Only the gallery and the
 * quantity/add-to-cart controls are Client Components.
 */
export default async function ProductDetailPage(props: PageProps<"/producto/[id]">) {
  const { id } = await props.params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const hasDiscount = product.isDiscountActive && !!product.discountPercentage;
  const discountedPrice = calculateDiscountedPrice(
    product.price,
    product.discountPercentage,
    product.isDiscountActive,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative">
          {hasDiscount && (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-cairo-primary px-2.5 py-1 text-xs font-semibold text-cairo-bg">
              -{product.discountPercentage}% OFF
            </span>
          )}
          <ProductGallery images={product.imageUrls} alt={product.name} />
        </div>

        <div>
          <h1 className="font-heading text-3xl text-cairo-text">{product.name}</h1>
          {hasDiscount ? (
            <p className="mt-3 flex items-baseline gap-3">
              <span className="text-lg text-cairo-text/50 line-through">
                {PRICE_FORMATTER.format(product.price)}
              </span>
              <span className="text-3xl font-bold text-cairo-primary">
                {PRICE_FORMATTER.format(discountedPrice)}
              </span>
            </p>
          ) : (
            <p className="mt-3 text-2xl font-semibold text-cairo-text">
              {PRICE_FORMATTER.format(product.price)}
            </p>
          )}

          {product.description && (
            <p className="mt-6 text-sm leading-relaxed text-cairo-text/70">{product.description}</p>
          )}

          <div className="mt-8">
            <ProductQuantityAddToCart product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
