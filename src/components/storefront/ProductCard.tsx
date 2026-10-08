import Link from "next/link";
import type { Product } from "@/types";
import { AddToCartButton } from "@/components/storefront/AddToCartButton";
import { ProductImageCarousel } from "@/components/storefront/ProductImageCarousel";
import { calculateDiscountedPrice } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
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
 */
export function ProductCard({ product }: ProductCardProps) {
  const href = `/producto/${product.id}`;
  const hasDiscount = product.isDiscountActive && !!product.discountPercentage;
  const discountedPrice = calculateDiscountedPrice(
    product.price,
    product.discountPercentage,
    product.isDiscountActive,
  );

  return (
    <article className="group transition-all duration-200 ease-in-out hover:-translate-y-1">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-cairo-accent-yellow/40">
        <Link href={href} aria-label={product.name} className="absolute inset-0 z-0 block">
          <ProductImageCarousel images={product.imageUrls} alt={product.name} />
        </Link>

        {hasDiscount && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-cairo-primary px-2.5 py-1 text-xs font-semibold text-cairo-bg">
            -{product.discountPercentage}% OFF
          </span>
        )}

        <div className="absolute bottom-3 right-3 z-10">
          <AddToCartButton product={product} />
        </div>
      </div>

      <Link href={href} className="mt-3 flex items-start justify-between gap-2">
        {/* `font-sans` is explicit here for clarity even though it is the
            default body typeface (Headline Sans, see tailwind.config.ts). */}
        <h3 className="font-sans text-sm text-cairo-text">{product.name}</h3>
        {hasDiscount ? (
          <p className="shrink-0 text-right">
            <span className="block text-xs text-cairo-text/50 line-through">
              {PRICE_FORMATTER.format(product.price)}
            </span>
            <span className="block text-sm font-bold text-cairo-primary">
              {PRICE_FORMATTER.format(discountedPrice)}
            </span>
          </p>
        ) : (
          <p className="shrink-0 text-sm font-semibold text-cairo-text">
            {PRICE_FORMATTER.format(product.price)}
          </p>
        )}
      </Link>
    </article>
  );
}
