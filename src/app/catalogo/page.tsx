import { Suspense } from "react";
import { CatalogSection, CatalogSectionSkeleton } from "@/components/storefront/CatalogSection";
import type { ProductSortOption } from "@/services/productService";
import { readArrayParam, readNumberParam, readStringParam } from "@/lib/searchParams";

const VALID_SORT_OPTIONS: ProductSortOption[] = ["newest", "price_asc", "price_desc"];

/** Narrows the raw `?sort=` string to a known `ProductSortOption`, defaulting to `undefined` (= "newest") for anything else. */
function readSortParam(value: string | undefined): ProductSortOption | undefined {
  return VALID_SORT_OPTIONS.includes(value as ProductSortOption) ? (value as ProductSortOption) : undefined;
}

// Dedicated catalog page: same filters + grid as the Home page section, but
// without the hero slider — just a simple, aesthetic header.
export default function CatalogoPage(props: PageProps<"/catalogo">) {
  return (
    <div className="overflow-x-hidden pt-12">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cairo-text/50">Cairo</p>
        <h1 className="mt-2 font-heading text-4xl text-cairo-text">Nuestro Catálogo</h1>
      </div>

      {/* `searchParams` is only read inside `FilteredCatalogSection`, behind
          this boundary, so the header above streams immediately instead of
          waiting on the filtered products query. */}
      <Suspense fallback={<CatalogSectionSkeleton />}>
        <FilteredCatalogSection searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function FilteredCatalogSection({
  searchParams,
}: {
  searchParams: PageProps<"/catalogo">["searchParams"];
}) {
  const resolvedSearchParams = await searchParams;

  const categorySlug = readStringParam(resolvedSearchParams, "category");
  const colors = readArrayParam(resolvedSearchParams, "color");
  const minPrice = readNumberParam(resolvedSearchParams, "minPrice");
  const maxPrice = readNumberParam(resolvedSearchParams, "maxPrice");
  const searchQuery = readStringParam(resolvedSearchParams, "q");
  const page = readNumberParam(resolvedSearchParams, "page") ?? 1;
  const sort = readSortParam(readStringParam(resolvedSearchParams, "sort"));

  return (
    <CatalogSection
      title="Todos los productos"
      categorySlug={categorySlug}
      colors={colors}
      minPrice={minPrice}
      maxPrice={maxPrice}
      searchQuery={searchQuery}
      page={page}
      sort={sort}
      showSearchAndPagination
    />
  );
}
