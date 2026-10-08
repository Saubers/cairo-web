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
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-heading text-2xl text-cairo-text">{title}</h1>
        {description && <p className="mt-1 text-sm text-cairo-text/60">{description}</p>}
      </div>
      {action}
    </div>
  );
}
