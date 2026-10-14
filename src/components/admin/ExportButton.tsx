"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/csv";

interface ExportButtonProps<T extends object> {
  /** Filename prefix, e.g. "cairo_pedidos" — the date is appended automatically. */
  filenamePrefix: string;
  /** Fetches the rows to export; called fresh on every click so filters stay current. */
  fetchRows: () => Promise<T[]>;
}

/**
 * Generic "Exportar" button for admin list pages: fetches the current
 * filtered rows from a Server Action and downloads them as CSV. Reusable
 * across tables (products, orders, ...) via the `fetchRows` callback.
 */
export function ExportButton<T extends object>({
  filenamePrefix,
  fetchRows,
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport(): Promise<void> {
    setIsExporting(true);

    try {
      const rows = await fetchRows();

      if (rows.length === 0) {
        toast.error("No hay datos para exportar.");
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      exportToCsv(`${filenamePrefix}_${today}.csv`, rows);
      toast.success("Exportación lista.");
    } catch {
      toast.error("No se pudo exportar el archivo.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-2 rounded-md border border-cairo-text/15 bg-cairo-bg px-4 py-2 text-sm font-medium text-cairo-text transition-all duration-200 ease-in-out hover:bg-cairo-accent-blue/10 disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      {isExporting ? "Exportando..." : "Exportar"}
    </button>
  );
}
