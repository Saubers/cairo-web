import Link from "next/link";
import type { Product } from "@/types";
import { AddToCartButton } from "@/components/storefront/AddToCartButton";
import { ProductImageCarousel } from "@/components/storefront/ProductImageCarousel";
import { calculateDiscountedPrice } from "@/lib/utils";
import { getAvailableDisplayVariant } from "@/lib/productStock";

interface ProductCardProps {
  product: Product;
  /** Marks this card's image as the page's LCP element (first above-the-fold card only). */
  priority?: boolean;
}

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/**
 * Server-rendered product card. Title and price are plain markup (crawlable
 * for SEO); the image carousel and "add to cart" action are isolated Client
 * Components. Clicking the image or title navigates to the product detail
 * page; clicking the carousel arrows or the "add to cart" button does not.
 *
 * Framed as a white, bordered "premium" card rather than letting the photo
 * blend into the page background: the uploaded product JPGs carry their own
 * white background, so matching that intentionally (instead of fighting it
 * with a transparent/cream container) is what keeps the grid looking
 * uniform across products shot against different real-world backdrops.
 */
export function ProductCard({ product, priority = false }: ProductCardProps) {
  const href = `/producto/${product.id}`;
  const hasDiscount = product.isDiscountActive && !!product.discountPercentage;

  // Picks the first color (base color or a real variant) that still has
  // stock, so a product whose base color sold out but still has an
  // available variant shows that variant's photo instead of an "Agotado"
  // badge on a color nobody can actually buy. Only `null` when every color
  // — base included — is sold out.
  const displayVariant = getAvailableDisplayVariant(product);
  const outOfStock = displayVariant === null;
  const displayImages = displayVariant && displayVariant.images.length > 0 ? displayVariant.images : product.imageUrls;

  const discountedPrice = calculateDiscountedPrice(
    product.price,
    product.discountPercentage,
    product.isDiscountActive,
  );

  return (
    // `h-full` stretches every card to its grid row's height (the parent grid's default
    // `align-items: stretch`), so a short one-line title never leaves its price sitting
    // higher than a neighboring card's — see the `mt-auto` price block below.
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md">
      {/* Image frame: a strict, uniform aspect ratio so every card in the grid lines up
          regardless of the uploaded photo's own dimensions — `object-contain` (applied inside
          `ProductImageCarousel`/`ProductImage`) then fits a tall or wide bag inside this square
          without cropping or stretching it. `shrink-0` keeps this frame's height fixed even if
          the text block below grows past one line. */}
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-white">
        <Link href={href} aria-label={product.name} className="absolute inset-0 z-0 block">
          <ProductImageCarousel images={displayImages} alt={product.name} priority={priority} />
        </Link>

        {hasDiscount && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-cairo-primary px-2.5 py-1 text-xs font-semibold text-cairo-bg">
            -{product.discountPercentage}% OFF
          </span>
        )}

        {outOfStock && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-cairo-text px-2.5 py-1 text-xs font-semibold text-cairo-bg">
            Agotado
          </span>
        )}

        <div className="absolute bottom-3 right-3 z-10">
          <AddToCartButton product={product} />
        </div>
      </div>

      {/* Text block: consistent padding regardless of title length. `flex-grow` lets this block
          fill whatever vertical space `h-full` leaves above, and `mt-auto` on the price pins it
          to the bottom of that space — so a two-line title never pushes the price further down
          than a one-line title's price in the same grid row. */}
      <Link href={href} className="flex flex-grow flex-col p-4">
        {/* `font-sans` is explicit here for clarity even though it is the
            default body typeface (Headline Sans, see tailwind.config.ts). */}
        <h3 className="font-sans text-sm text-cairo-text">{product.name}</h3>

        <div className="mt-auto pt-2">
          {hasDiscount ? (
            <p className="flex items-baseline gap-2">
              <span className="text-xs text-cairo-text/50 line-through">
                {PRICE_FORMATTER.format(product.price)}
              </span>
              <span className="text-sm font-bold text-cairo-primary">
                {PRICE_FORMATTER.format(discountedPrice)}
              </span>
            </p>
          ) : (
            <p className="text-sm font-semibold text-cairo-text">{PRICE_FORMATTER.format(product.price)}</p>
          )}
        </div>
      </Link>
    </article>
  );
}
