/**
 * Shared helpers for reading typed values out of Next.js `searchParams`
 * objects (`Record<string, string | string[] | undefined>`), used by every
 * Server Component page that filters the product catalog by URL params.
 */

/** Reads a single-value search param, ignoring the array form (`?x=1&x=2`). */
export function readStringParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = searchParams[key];
  return typeof value === "string" ? value : undefined;
}

/** Reads a numeric search param; returns `undefined` for missing/invalid values. */
export function readNumberParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): number | undefined {
  const raw = readStringParam(searchParams, key);
  if (raw === undefined) return undefined;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Reads a multi-value search param, supporting both the repeated-key form
 * (`?color=rojo&color=negro`, parsed by Next.js into a `string[]`) and the
 * comma-separated form (`?color=rojo,negro`). Returns an empty array when
 * the param is missing.
 */
export function readArrayParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string[] {
  const value = searchParams[key];
  if (value === undefined) return [];

  const rawValues = Array.isArray(value) ? value : [value];
  return rawValues
    .flatMap((rawValue) => rawValue.split(","))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
