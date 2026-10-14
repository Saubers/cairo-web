"use client";

import { ExportButton } from "@/components/admin/ExportButton";
import { exportOrdersForCsv } from "@/app/admin/orders/actions";

interface ExportOrdersButtonProps {
  /** Current `startDate`/`endDate` range from the orders list, so the export matches what's filtered on screen. */
  startDate?: string;
  endDate?: string;
}

/** Binds the generic `ExportButton` to the orders CSV export Server Action. */
export function ExportOrdersButton({ startDate, endDate }: ExportOrdersButtonProps) {
  return (
    <ExportButton
      filenamePrefix="cairo_pedidos"
      fetchRows={() => exportOrdersForCsv({ startDate, endDate })}
    />
  );
}
