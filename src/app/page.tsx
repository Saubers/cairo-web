import { HeroSlider } from "@/components/storefront/HeroSlider";
import { CatalogSection } from "@/components/storefront/CatalogSection";
import { getActiveHeroSlides } from "@/services/heroSlideService";
import { readArrayParam, readNumberParam, readStringParam } from "@/lib/searchParams";

// Server Component: the Navbar is rendered globally in the root layout.
// Category/color/price filters come from URL search params so the grid
// stays server-rendered (and SEO/shareable) while `ProductFilters` (a
// Client Component) only has to update the URL, not local state.
export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;

  const categorySlug = readStringParam(searchParams, "category");
  const colors = readArrayParam(searchParams, "color");
  const minPrice = readNumberParam(searchParams, "minPrice");
  const maxPrice = readNumberParam(searchParams, "maxPrice");

  // Cached for an hour at the data layer (see `getActiveHeroSlides`) — the
  // rest of this page (the filterable catalog below) stays fully dynamic.
  const slides = await getActiveHeroSlides();

  return (
    <>
      <HeroSlider slides={slides} />

      <CatalogSection
        title="Novedades"
        categorySlug={categorySlug}
        colors={colors}
        minPrice={minPrice}
        maxPrice={maxPrice}
      />
    </>
  );
}
