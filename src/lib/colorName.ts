/**
 * Shared color-name normalization, used wherever a user-entered color
 * string (the base product's `color` or a variant's `colorName`) needs to
 * be compared or stored consistently. Centralizing this is what fixes the
 * catalog filter bug where free-typed colors like "marron" and "Marrón"
 * were treated as two unrelated colors.
 */

/**
 * Case/diacritic-insensitive comparison key for a color name — e.g.
 * "Marrón", "marron", and "  MARRÓN" all fold to the same `"marron"` key.
 * Used to group/deduplicate colors and to match a catalog filter selection
 * against both newly-standardized and legacy (inconsistently-cased) rows.
 */
export function normalizeColorKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Canonical display/storage form for a color name: trimmed, single-spaced,
 * Title Case — e.g. "  marrón  " -> "Marrón", "ROJO OSCURO" -> "Rojo Oscuro".
 * Diacritics are preserved (unlike `normalizeColorKey`) since they're part
 * of the correct spelling, not noise to strip for storage.
 *
 * Applied by `productSchema` on every write, so a color saved through the
 * admin `ColorCombobox` — or any other client replaying the same Server
 * Action — always lands in the DB in one consistent casing, instead of
 * relying on the UI alone to enforce it.
 */
export function toTitleCaseColorName(value: string): string {
  const collapsed = value.trim().replace(/\s+/g, " ");
  if (!collapsed) return collapsed;

  return collapsed
    .toLowerCase()
    .split(" ")
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}
