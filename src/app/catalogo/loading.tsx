import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Mirrors `CatalogSection`'s grid (filters bar + `ProductCard` grid) so the
 * catalog never jumps once real products/categories/colors resolve.
 */
export default function CatalogoLoading() {
  return (
    <div className="pt-12">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <Skeleton className="mx-auto h-4 w-16" />
        <Skeleton className="mx-auto mt-3 h-9 w-64" />
      </div>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index}>
                <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
