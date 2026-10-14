import { CatalogSection } from "@/components/storefront/CatalogSection";
import type { ProductSortOption } from "@/services/productService";
import { readArrayParam, readNumberParam, readStringParam } from "@/lib/searchParams";

const VALID_SORT_OPTIONS: ProductSortOption[] = ["newest", "price_asc", "price_desc"];

/** Narrows the raw `?sort=` string to a known `ProductSortOption`, defaulting to `undefined` (= "newest") for anything else. */
function readSortParam(value: string | undefined): ProductSortOption | undefined {
  return VALID_SORT_OPTIONS.includes(value as ProductSortOption) ? (value as ProductSortOption) : undefined;
}

// Dedicated catalog page: same filters + grid as the Home page section, but
// without the hero slider — just a simple, aesthetic header.
export default async function CatalogoPage(props: PageProps<"/catalogo">) {
  const searchParams = await props.searchParams;

  const categorySlug = readStringParam(searchParams, "category");
  const colors = readArrayParam(searchParams, "color");
  const minPrice = readNumberParam(searchParams, "minPrice");
  const maxPrice = readNumberParam(searchParams, "maxPrice");
  const searchQuery = readStringParam(searchParams, "q");
  const page = readNumberParam(searchParams, "page") ?? 1;
  const sort = readSortParam(readStringParam(searchParams, "sort"));

  return (
    <div className="overflow-x-hidden pt-12">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cairo-text/50">Cairo</p>
        <h1 className="mt-2 font-heading text-4xl text-cairo-text">Nuestro Catálogo</h1>
      </div>

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
    </div>
  );
}
