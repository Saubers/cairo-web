import type { ColorOption } from "@/types";

/** Neutral gray used when a color has no hex code and no name-based match. */
const FALLBACK_SWATCH_COLOR = "#d4d4d4";

/**
 * Basic Spanish color-name -> hex lookup, used only as a fallback when a
 * variant/base color has no `colorHex` set in the database. Keys are
 * matched case/whitespace-insensitively and only cover the common names
 * used in the catalog — anything unrecognized falls back to a neutral gray
 * swatch instead of guessing.
 */
const COLOR_NAME_HEX_MAP: Record<string, string> = {
  negro: "#1a1a1a",
  blanco: "#ffffff",
  gris: "#9ca3af",
  rojo: "#dc2626",
  azul: "#2563eb",
  verde: "#16a34a",
  amarillo: "#facc15",
  naranja: "#f97316",
  rosa: "#ec4899",
  violeta: "#8b5cf6",
  morado: "#8b5cf6",
  marron: "#78350f",
  chocolate: "#5c3a21",
  beige: "#e8dcc8",
  camel: "#c19a6b",
  crudo: "#f0e6d2",
  dorado: "#d4af37",
  plateado: "#c0c0c0",
  bordo: "#7b1e2b",
};

/**
 * Resolves the CSS color a swatch circle should render: the option's own
 * `colorHex` first, then a basic name-based lookup, then a neutral gray
 * fallback. Never throws — an unmapped color name just renders gray instead
 * of breaking the swatch row.
 */
export function resolveSwatchColor(option: Pick<ColorOption, "colorName" | "colorHex">): string {
  if (option.colorHex) return option.colorHex;

  const normalizedName = option.colorName.trim().toLowerCase();
  return COLOR_NAME_HEX_MAP[normalizedName] ?? FALLBACK_SWATCH_COLOR;
}
