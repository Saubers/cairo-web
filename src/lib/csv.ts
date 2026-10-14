/**
 * Escapes a single CSV field per RFC 4180: wraps it in double quotes whenever
 * it contains the delimiter, a quote, or a newline, and doubles any internal
 * quote. `null`/`undefined` become an empty field rather than the string
 * "null"/"undefined".
 */
function escapeCsvField(value: unknown, delimiter: string): string {
  if (value === null || value === undefined) return "";

  const stringValue = String(value);
  const needsQuoting = stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes("\n");

  if (!needsQuoting) return stringValue;

  return `"${stringValue.replace(/"/g, '""')}"`;
}

/**
 * Converts an array of flat objects into a CSV string and triggers a
 * browser download, respecting whatever rows are passed in (callers are
 * responsible for filtering beforehand).
 *
 * Uses `;` as the delimiter instead of `,` — in the es-AR Excel locale the
 * comma is the decimal separator, so a comma-delimited file opens as a
 * single garbled column instead of one column per field.
 *
 * Prepends a UTF-8 BOM (`\uFEFF`) to the Blob so Excel detects the encoding
 * correctly and renders accented characters (á, é, ñ) instead of mangling
 * them under a legacy ANSI codepage.
 */
export function exportToCsv<T extends object>(filename: string, rows: T[]): void {
  if (rows.length === 0) return;

  const delimiter = ";";
  const headers = Object.keys(rows[0]) as Array<keyof T>;

  const headerLine = headers.map((header) => escapeCsvField(header, delimiter)).join(delimiter);
  const dataLines = rows.map((row) =>
    headers.map((header) => escapeCsvField(row[header], delimiter)).join(delimiter),
  );

  const csvContent = [headerLine, ...dataLines].join("\r\n");
  const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
