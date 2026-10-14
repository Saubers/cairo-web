"use client";

import { ExportButton } from "@/components/admin/ExportButton";
import { exportProductsForCsv } from "@/app/admin/products/actions";

interface ExportProductsButtonProps {
  /** Current `q`/`startDate`/`endDate` params from the products list, so the export matches what's filtered on screen. */
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

/** Binds the generic `ExportButton` to the products CSV export Server Action. */
export function ExportProductsButton({ searchQuery, startDate, endDate }: ExportProductsButtonProps) {
  return (
    <ExportButton
      filenamePrefix="cairo_productos"
      fetchRows={() => exportProductsForCsv({ searchQuery, startDate, endDate })}
    />
  );
}
