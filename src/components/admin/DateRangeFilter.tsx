"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Date range filter for admin tables: two native date inputs bound to the
 * `startDate`/`endDate` URL search params, filtering rows by `created_at`.
 *
 * Writing to the URL (instead of local state) is what lets the "Exportar"
 * button pick up the same range automatically — it re-queries Supabase with
 * whatever `startDate`/`endDate` are currently in the URL, so the CSV always
 * matches what's filtered on screen.
 */
export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const hasActiveRange = Boolean(startDate || endDate);

  function updateParam(key: "startDate" | "endDate", value: string): void {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // A new date range restarts pagination from the first page.
    params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleClear(): void {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("startDate");
    params.delete("endDate");
    params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="startDate" className="text-xs font-medium uppercase tracking-wide text-cairo-text/50">
        Desde
      </label>
      <input
        id="startDate"
        type="date"
        value={startDate}
        max={endDate || undefined}
        onChange={(event) => updateParam("startDate", event.target.value)}
        className="rounded-md border border-cairo-text/20 bg-cairo-bg px-2 py-1.5 text-sm text-cairo-text outline-none transition-colors duration-200 ease-in-out focus:border-cairo-primary"
      />
      <span className="text-cairo-text/40">–</span>
      <label htmlFor="endDate" className="text-xs font-medium uppercase tracking-wide text-cairo-text/50">
        Hasta
      </label>
      <input
        id="endDate"
        type="date"
        value={endDate}
        min={startDate || undefined}
        onChange={(event) => updateParam("endDate", event.target.value)}
        className="rounded-md border border-cairo-text/20 bg-cairo-bg px-2 py-1.5 text-sm text-cairo-text outline-none transition-colors duration-200 ease-in-out focus:border-cairo-primary"
      />
      {hasActiveRange && (
        <button
          type="button"
          onClick={handleClear}
          className="text-xs font-medium text-cairo-text/50 underline-offset-2 hover:text-cairo-text hover:underline"
        >
          Limpiar
        </button>
      )}
    </div>
  );
}
