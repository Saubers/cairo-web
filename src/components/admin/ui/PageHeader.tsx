import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Primary action slot, typically a "Crear X" link/button rendered on the right. */
  action?: ReactNode;
}

/** Consistent title + primary-action row used at the top of every admin page. */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    // Stacks vertically on mobile (`flex-col items-start`) so a wide action slot (e.g. a
    // "Nuevo producto" button) never gets squeezed into the same row as the title — only
    // from `sm` up does it sit beside the title in a single row.
    <div className="flex w-full flex-col flex-wrap items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="font-heading text-2xl text-cairo-text">{title}</h1>
        {description && <p className="mt-1 text-sm text-cairo-text/60">{description}</p>}
      </div>
      {action}
    </div>
  );
}
