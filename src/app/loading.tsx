import { Spinner } from "@/components/ui/Spinner";

/**
 * Root-level fallback loading UI. Next.js renders this for any route that
 * doesn't define its own more specific `loading.tsx` (e.g. the homepage,
 * product detail, cart, collections, account pages) while that route's
 * Server Component data fetch is in flight. Routes with a heavier/data-shaped
 * UI (the catalog, the admin panel) define their own skeleton-based
 * `loading.tsx` instead, which Next.js prefers over this one.
 */
export default function RootLoading() {
  return (
    <div className="flex min-h-[60vh] w-full flex-1 flex-col items-center justify-center">
      <Spinner />
    </div>
  );
}
