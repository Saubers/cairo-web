import { ProductFilters } from "@/components/storefront/ProductFilters";
import { ProductCard } from "@/components/storefront/ProductCard";
import { SortSelect } from "@/components/storefront/SortSelect";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { getUniqueColors, getProducts, type ProductSortOption } from "@/services/productService";
import { getCategories } from "@/services/categoryService";
import { getTotalStock } from "@/lib/productStock";

interface CatalogSectionProps {
  title: string;
  categorySlug?: string;
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  searchQuery?: string;
  page?: number;
  sort?: ProductSortOption;
  /** Shows the search bar, sort dropdown, and pagination controls. Off by default so the Home page's "Novedades" preview stays a simple, unpaginated grid. */
  showSearchAndPagination?: boolean;
}

/**
 * Shared "filters + product grid" section, used by both the Home page
 * (under the hero slider) and the dedicated `/catalogo` page. Kept as an
 * async Server Component so both callers get the same server-rendered,
 * SEO-friendly grid without duplicating the fetch/render logic.
 */
export async function CatalogSection({
  title,
  categorySlug,
  colors,
  minPrice,
  maxPrice,
  searchQuery,
  page,
  sort,
  showSearchAndPagination = false,
}: CatalogSectionProps) {
  const [{ data: products, totalPages }, categories, availableColors] = await Promise.all([
    getProducts({ categorySlug, colors, minPrice, maxPrice, searchQuery, page, sort }),
    getCategories(),
    getUniqueColors(),
  ]);

  // Push fully sold-out products (base color AND every variant at 0 stock)
  // to the end of the grid, without disturbing the relative order of
  // everything else (featured/date/etc. ordering from the query). `sort` is
  // spec-stable since ES2019, so this partition-by-stock is safe to do
  // directly on the fetched page.
  const sortedProducts = [...products].sort(
    (a, b) => (getTotalStock(b) > 0 ? 1 : 0) - (getTotalStock(a) > 0 ? 1 : 0),
  );

  return (
    // `overflow-x-hidden` is a preventive guard: it contains any rogue child (e.g. a
    // filter control that briefly grows past its track) instead of letting it force a
    // horizontal scrollbar on the whole page body.
    <section className="overflow-x-hidden py-16">
      <h2 className="px-4 text-center font-heading text-3xl text-cairo-text sm:px-6 lg:px-8">
        {title}
      </h2>

      <div className="mt-8">
        {showSearchAndPagination && (
          <div className="mx-auto max-w-md px-4 pb-4 sm:px-6 lg:px-8">
            <SearchBar placeholder="Buscar productos..." />
          </div>
        )}
        <ProductFilters categories={categories} colors={availableColors} />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {showSearchAndPagination && (
          <div className="mb-6 flex justify-end">
            <SortSelect />
          </div>
        )}

        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {sortedProducts.map((product, index) => (
              // Only the very first card is above-the-fold on both the Home
              // page (right under the Hero) and `/catalogo` — it's the
              // page's actual LCP element, since `HeroSlider` renders no
              // `<Image>` of its own.
              <ProductCard
                key={product.id}
                product={product}
                priority={index === 0}
                activeColorFilter={colors}
              />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-cairo-text/60">
            No encontramos productos en esta categoría todavía.
          </p>
        )}

        {showSearchAndPagination && (
          <div className="mt-10">
            <Pagination currentPage={page ?? 1} totalPages={totalPages} />
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * `<Suspense>` fallback for `CatalogSection`, mirroring its grid shape so
 * nothing shifts once the real products stream in. Used by the Home and
 * `/catalogo` pages, which both read `searchParams` to build this section's
 * filter props — wrapping it in `<Suspense>` lets everything above it
 * (hero slider, page header) flush to the browser immediately instead of
 * waiting on the filtered-products query.
 */
export function CatalogSectionSkeleton() {
  return (
    <section className="overflow-x-hidden py-16">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square w-full" />
          ))}
        </div>
      </div>
    </section>
  );
}
