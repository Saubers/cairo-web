import type { ReactNode } from "react";

interface CardProps {
  /** Optional section title rendered above the card body. */
  title?: string;
  /** Optional short description rendered under the title. */
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Elevated white surface used throughout the admin backoffice to group
 * related content (tables, form sections) on top of the subtle page
 * background set in `AdminShell`.
 */
export function Card({ title, description, children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-xl bg-white shadow-sm ring-1 ring-cairo-text/5 ${className}`}
    >
      {(title || description) && (
        <div className="border-b border-cairo-text/5 px-6 py-4">
          {title && <h2 className="font-medium text-cairo-text">{title}</h2>}
          {description && <p className="mt-0.5 text-sm text-cairo-text/50">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
