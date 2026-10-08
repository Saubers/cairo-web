"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Category } from "@/types";

interface ProductFiltersProps {
  categories: Category[];
  colors: string[];
}

// Delay before rapid category/color clicks are collapsed into a single URL
// sync — see the `useEffect` below for why.
const FILTER_SYNC_DEBOUNCE_MS = 300;

/**
 * Catalog filter bar for the storefront product grid.
 *
 * Category and color selections are tracked in local state first (the
 * source of truth for the UI, so clicks feel instant) and only synced to the
 * URL after a short debounce. Without this, a `router.push` from `searchParams`
 * `useSearchParams` snapshot could race with another `router.push` started by
 * a rapid follow-up click, silently dropping one of the clicks. Debouncing
 * collapses any burst of rapid clicks into a single navigation.
 *
 * Price range is staged in local state and only applied to the URL on
 * submit, so typing in the inputs doesn't trigger a navigation on every
 * keystroke. This flow is independent of the category/color debounce above.
 *
 * Color supports multi-select: each selected color is written as its own
 * repeated `color=` param (e.g. `?color=rojo&color=negro`), read back via
 * `searchParams.getAll("color")`. Clicking an already-active color toggles
 * it off.
 *
 * All filters live in the `category` / `color` / `minPrice` / `maxPrice` URL
 * search params so the product grid (rendered in the Server Component
 * `app/page.tsx`) re-fetches with the new filters on navigation, instead of
 * duplicating fetch logic here.
 */
export function ProductFilters({ categories, colors }: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [categorySlug, setCategorySlug] = useState<string | null>(
    searchParams.get("category"),
  );
  const [selectedColors, setSelectedColors] = useState<string[]>(searchParams.getAll("color"));

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");

  // Debounce the local category/color state into the URL so a burst of rapid
  // clicks results in a single navigation instead of one per click.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (categorySlug) {
        params.set("category", categorySlug);
      } else {
        params.delete("category");
      }

      params.delete("color");
      for (const selectedColor of selectedColors) {
        params.append("color", selectedColor);
      }

      const query = params.toString();
      const nextUrl = query ? `${pathname}?${query}` : pathname;

      // Skip the push if it would be a no-op (e.g. right after `handleClearAll`
      // already navigated immediately).
      const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
      if (nextUrl === currentUrl) return;

      // `scroll: false` keeps the current scroll position — without it, Next.js
      // scrolls back to the top of the page on every filter change.
      router.push(nextUrl, { scroll: false });
    }, FILTER_SYNC_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug, selectedColors]);

  function handleSelectCategory(slug: string | null): void {
    setCategorySlug(slug);
  }

  function handleToggleColor(color: string): void {
    setSelectedColors((current) => {
      // Clicking an already-active color deselects it.
      if (current.includes(color)) {
        return current.filter((selectedColor) => selectedColor !== color);
      }
      return [...current, color];
    });
  }

  function handleApplyPriceRange(): void {
    const params = new URLSearchParams(searchParams.toString());

    if (minPrice) {
      params.set("minPrice", minPrice);
    } else {
      params.delete("minPrice");
    }

    if (maxPrice) {
      params.set("maxPrice", maxPrice);
    } else {
      params.delete("maxPrice");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleClearAll(): void {
    setCategorySlug(null);
    setSelectedColors([]);
    setMinPrice("");
    setMaxPrice("");
    router.push(pathname, { scroll: false });
  }

  const hasActiveFilters = Boolean(
    categorySlug || selectedColors.length > 0 || minPrice || maxPrice,
  );

  return (
    <div className="sticky top-14 z-10 border-b border-cairo-text/10 bg-cairo-bg/95 backdrop-blur">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6 lg:px-8">
        {/* Category tabs */}
        <div className="flex w-max gap-8 overflow-x-auto sm:w-full sm:justify-center">
          <button
            type="button"
            aria-pressed={categorySlug === null}
            onClick={() => handleSelectCategory(null)}
            className={`whitespace-nowrap border-b-2 pb-1 text-sm font-medium transition-colors ${
              categorySlug === null
                ? "border-cairo-primary text-cairo-primary"
                : "border-transparent text-cairo-text/60 hover:text-cairo-text"
            }`}
          >
            Todas
          </button>

          {categories.map((category) => {
            const isActive = categorySlug === category.slug;

            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleSelectCategory(category.slug)}
                className={`whitespace-nowrap border-b-2 pb-1 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-cairo-primary text-cairo-primary"
                    : "border-transparent text-cairo-text/60 hover:text-cairo-text"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>

        {/* Color + price range filters */}
        <div className="flex flex-wrap items-end gap-6">
          {colors.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-cairo-text/50">
                Color
              </span>
              {colors.map((color) => {
                const isActive = selectedColors.includes(color);

                return (
                  <button
                    key={color}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handleToggleColor(color)}
                    className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                      isActive
                        ? "border-cairo-primary bg-cairo-primary text-cairo-bg"
                        : "border-cairo-text/20 text-cairo-text/70 hover:border-cairo-text/40"
                    }`}
                  >
                    {color}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-cairo-text/50">
              Precio
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Mín"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              className="w-20 rounded-md border border-cairo-text/20 bg-cairo-bg px-2 py-1 text-xs text-cairo-text outline-none focus:border-cairo-primary"
            />
            <span className="text-cairo-text/40">–</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Máx"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              className="w-20 rounded-md border border-cairo-text/20 bg-cairo-bg px-2 py-1 text-xs text-cairo-text outline-none focus:border-cairo-primary"
            />
            <button
              type="button"
              onClick={handleApplyPriceRange}
              className="rounded-md bg-cairo-primary px-3 py-1 text-xs font-medium text-cairo-bg transition-opacity hover:opacity-90"
            >
              Aplicar
            </button>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-medium text-cairo-text/50 underline-offset-2 hover:text-cairo-text hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
