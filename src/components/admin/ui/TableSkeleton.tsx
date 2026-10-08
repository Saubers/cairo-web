import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/admin/ui/Card";

interface TableSkeletonProps {
  /** Number of placeholder cells per row. */
  columns: number;
  /** Number of placeholder rows. Defaults to 6. */
  rows?: number;
  /** Whether to reserve space for a primary action button next to the title. */
  withAction?: boolean;
}

/**
 * Shared `loading.tsx` skeleton for admin list pages (Productos, Categorías,
 * Colecciones, Pedidos) — mirrors the `PageHeader` + `Card`-wrapped table
 * shape those pages actually render, so there is no layout shift once the
 * real data arrives.
 */
export function TableSkeleton({ columns, rows = 6, withAction = false }: TableSkeletonProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        {withAction && <Skeleton className="h-10 w-40" />}
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="divide-y divide-cairo-text/5">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-6 px-6 py-4">
              {Array.from({ length: columns }).map((__, columnIndex) => (
                <Skeleton key={columnIndex} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
