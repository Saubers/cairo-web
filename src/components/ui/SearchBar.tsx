"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

const DEBOUNCE_MS = 400;

interface SearchBarProps {
  placeholder?: string;
}

/**
 * Debounced text search input. Writes to the `q` URL search param — and
 * resets `page` back to its default (by removing it) — only after the user
 * stops typing, avoiding a navigation (and therefore a server refetch) on
 * every keystroke.
 *
 * Every other search param (filters, `page` set by `Pagination`) is
 * preserved, since it reads the current `searchParams` and only mutates
 * `q`/`page`.
 */
export function SearchBar({ placeholder = "Buscar..." }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);

  // Tracks the last value *this component* pushed to the URL, so the sync
  // effect below can tell "the URL changed because someone else cleared it"
  // (e.g. "Limpiar filtros") apart from "the URL changed because our own
  // debounced push just landed" — only the former should overwrite `value`.
  const lastPushedQueryRef = useRef(urlQuery);

  useEffect(() => {
    if (urlQuery !== lastPushedQueryRef.current) {
      setValue(urlQuery);
      lastPushedQueryRef.current = urlQuery;
    }
  }, [urlQuery]);

  useEffect(() => {
    if (value === urlQuery) return;

    const timeoutId = setTimeout(() => {
      lastPushedQueryRef.current = value;

      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set("q", value);
      } else {
        // Clearing the input removes `q` entirely instead of leaving an
        // empty string in the URL.
        params.delete("q");
      }

      // Any new search restarts pagination from the first page.
      params.delete("page");

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [value, urlQuery, searchParams, pathname, router]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cairo-text/40" />
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label="Buscar productos"
        className="w-full rounded-md border border-cairo-text/20 bg-cairo-bg py-2 pl-9 pr-3 text-sm text-cairo-text outline-none transition-colors duration-200 ease-in-out focus:border-cairo-primary"
      />
    </div>
  );
}
