"use client";

import type { ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SORT_OPTIONS = [
  { value: "newest", label: "Novedades" },
  { value: "price_asc", label: "Precio: Menor a Mayor" },
  { value: "price_desc", label: "Precio: Mayor a Menor" },
] as const;

/**
 * Sort dropdown for the public catalog grid. Writes the selected option to
 * the `sort` URL search param (read server-side by `getProducts`) instead
 * of local component state — this keeps the sorted view server-rendered,
 * shareable, and bookmarkable (e.g. a link sorted by "Precio: Menor a
 * Mayor" works the same for anyone who opens it), rather than resetting to
 * the default order on every page load.
 */
export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get("sort") ?? "newest";

  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    const value = event.target.value;
    const params = new URLSearchParams(searchParams.toString());

    if (value === "newest") {
      // "newest" is the default order — omit it from the URL instead of
      // writing a redundant `?sort=newest`.
      params.delete("sort");
    } else {
      params.set("sort", value);
    }

    // A new sort order restarts pagination from the first page.
    params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-xs font-medium uppercase tracking-wide text-cairo-text/50">
        Ordenar por
      </label>
      <select
        id="sort"
        value={currentSort}
        onChange={handleChange}
        className="rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-1.5 text-sm text-cairo-text outline-none transition-colors duration-200 ease-in-out focus:border-cairo-primary"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
