import Link from "next/link";
import type { Product } from "@/types";
import { ProductCardMedia } from "@/components/storefront/ProductCardMedia";
import { calculateDiscountedPrice } from "@/lib/utils";
import { getAvailableDisplayVariant, matchesActiveColorFilter } from "@/lib/productStock";
import { buildColorOptions } from "@/lib/colorOptions";

interface ProductCardProps {
  product: Product;
  /** Marks this card's image as the page's LCP element (first above-the-fold card only). */
  priority?: boolean;
  /**
   * Colors currently selected in the catalog's color filter (e.g. from
   * `?color=chocolate&color=negro`), if any. When set, the card prioritizes
   * showing the matching color variant instead of the default base/first-
   * in-stock one — see `getAvailableDisplayVariant`.
   */
  activeColorFilter?: string[];
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
export function ProductCard({ product, priority = false, activeColorFilter }: ProductCardProps) {
  const hasDiscount = product.isDiscountActive && !!product.discountPercentage;

  // When a color filter is active, prioritizes the matching color variant
  // (even out of stock, so the shopper understands why this product matched
  // their search) over the default base/first-in-stock one. `null` only
  // when every color — base included — is sold out. See `getAvailableDisplayVariant`.
  const displayVariant = getAvailableDisplayVariant(product, activeColorFilter);
  const outOfStock = displayVariant === null || displayVariant.stock === 0;
  const displayImages = displayVariant && displayVariant.images.length > 0 ? displayVariant.images : product.imageUrls;

  // Carries the matched color over to the product detail page so it opens
  // already showing the same variant the card displayed. Only appended when
  // the displayed variant actually came from the active filter — a card
  // falling back to its default variant has nothing filter-specific to pass on.
  const matchedFilterColor =
    displayVariant && matchesActiveColorFilter(displayVariant.colorName, activeColorFilter)
      ? displayVariant.colorName
      : null;
  const href = matchedFilterColor
    ? `/producto/${product.id}?color=${encodeURIComponent(matchedFilterColor)}`
    : `/producto/${product.id}`;

  // Every selectable color (base + variants), used by `ProductCardMedia` to
  // render the quick color-preview swatches below the image.
  const colorOptions = buildColorOptions(product);

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
      {/* Image frame + color swatches: a strict, uniform aspect ratio so every card in the
          grid lines up regardless of the uploaded photo's own dimensions, and the quick color
          preview swatches below it — both owned by `ProductCardMedia` so the swatch hover
          preview can share local state with the image it controls, without turning this whole
          card client-side. */}
      <ProductCardMedia
        product={product}
        href={href}
        images={displayImages}
        colorOptions={colorOptions}
        priority={priority}
        hasDiscount={hasDiscount}
        outOfStock={outOfStock}
        activeColorFilter={activeColorFilter}
      />

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
