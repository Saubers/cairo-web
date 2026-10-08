"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

/**
 * Collapses a long page range into the first page, the last page, and a
 * small window around the current page, with an ellipsis marker filling
 * the gaps — e.g. for page 7 of 20: `1 … 6 7 8 … 20`.
 */
function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = [];

  for (let page = 1; page <= total; page++) {
    const isEdge = page === 1 || page === total;
    const isNearCurrent = Math.abs(page - current) <= 1;

    if (isEdge || isNearCurrent) {
      pages.push(page);
    } else if (pages[pages.length - 1] !== "ellipsis") {
      pages.push("ellipsis");
    }
  }

  return pages;
}

const BUTTON_BASE_CLASS =
  "flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm transition-colors duration-200 ease-in-out";

/**
 * Page-number pagination control. Only overwrites the `page` search param,
 * preserving every other one (filters, `q`) already in the URL — so it
 * composes with `SearchBar`/`ProductFilters` without either clobbering the
 * other's state.
 */
export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(page: number): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-1">
      <button
        type="button"
        aria-label="Página anterior"
        disabled={currentPage <= 1}
        onClick={() => goToPage(currentPage - 1)}
        className={`${BUTTON_BASE_CLASS} text-cairo-text/60 hover:bg-cairo-accent-blue/20 disabled:pointer-events-none disabled:opacity-30`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pageNumbers.map((page, index) =>
        page === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-1 text-sm text-cairo-text/40">
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            aria-label={`Página ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
            onClick={() => goToPage(page)}
            className={`${BUTTON_BASE_CLASS} ${
              page === currentPage
                ? "bg-cairo-primary font-medium text-cairo-bg"
                : "text-cairo-text/70 hover:bg-cairo-accent-blue/20"
            }`}
          >
            {page}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Página siguiente"
        disabled={currentPage >= totalPages}
        onClick={() => goToPage(currentPage + 1)}
        className={`${BUTTON_BASE_CLASS} text-cairo-text/60 hover:bg-cairo-accent-blue/20 disabled:pointer-events-none disabled:opacity-30`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
