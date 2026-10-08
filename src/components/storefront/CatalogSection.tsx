import { ProductFilters } from "@/components/storefront/ProductFilters";
import { ProductCard } from "@/components/storefront/ProductCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { Pagination } from "@/components/ui/Pagination";
import { getAvailableColors, getProducts } from "@/services/productService";
import { getCategories } from "@/services/categoryService";

interface CatalogSectionProps {
  title: string;
  categorySlug?: string;
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  searchQuery?: string;
  page?: number;
  /** Shows the search bar and pagination controls. Off by default so the Home page's "Novedades" preview stays a simple, unpaginated grid. */
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
  showSearchAndPagination = false,
}: CatalogSectionProps) {
  const [{ data: products, totalPages }, categories, availableColors] = await Promise.all([
    getProducts({ categorySlug, colors, minPrice, maxPrice, searchQuery, page }),
    getCategories(),
    getAvailableColors(),
  ]);

  return (
    <section className="py-16">
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
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
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
