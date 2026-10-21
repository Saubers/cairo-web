import { Suspense } from "react";
import { HeroSlider } from "@/components/storefront/HeroSlider";
import { CatalogSection, CatalogSectionSkeleton } from "@/components/storefront/CatalogSection";
import { getActiveHeroSlides } from "@/services/heroSlideService";
import { readArrayParam, readNumberParam, readStringParam } from "@/lib/searchParams";

// Server Component: the Navbar is rendered globally in the root layout.
// Category/color/price filters come from URL search params so the grid
// stays server-rendered (and SEO/shareable) while `ProductFilters` (a
// Client Component) only has to update the URL, not local state.
export default async function Home(props: PageProps<"/">) {
  // Cached for an hour at the data layer (see `getActiveHeroSlides`) — kept
  // outside the `<Suspense>` boundary below so the slider renders with the
  // rest of the static shell instead of waiting on the filtered catalog.
  const slides = await getActiveHeroSlides();

  return (
    <>
      <HeroSlider slides={slides} />

      {/* `searchParams` is only read inside `FilteredCatalogSection`, behind
          this boundary, so a slow/uncached products query streams in without
          blocking the hero above it. */}
      <Suspense fallback={<CatalogSectionSkeleton />}>
        <FilteredCatalogSection searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function FilteredCatalogSection({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const resolvedSearchParams = await searchParams;

  const categorySlug = readStringParam(resolvedSearchParams, "category");
  const colors = readArrayParam(resolvedSearchParams, "color");
  const minPrice = readNumberParam(resolvedSearchParams, "minPrice");
  const maxPrice = readNumberParam(resolvedSearchParams, "maxPrice");

  return (
    <CatalogSection
      title="Novedades"
      categorySlug={categorySlug}
      colors={colors}
      minPrice={minPrice}
      maxPrice={maxPrice}
    />
  );
}
