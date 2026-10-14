"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { AddCategoryForm } from "@/components/admin/AddCategoryForm";
import { Card } from "@/components/admin/ui/Card";

/**
 * Header row for the admin categories page: title + description on the
 * left, a primary "Nueva categoría" toggle on the right. Clicking it reveals
 * an inline `AddCategoryForm` card — categories only have one editable
 * field, so a dedicated `/new` route would be unnecessary overhead.
 */
export function CategoryCreatePanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      {/* Mirrors the shared `PageHeader`'s mobile-first stacking: title above, action below,
          only sitting side-by-side from `sm` up. */}
      <div className="flex w-full flex-col flex-wrap items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-2xl text-cairo-text">Categorías</h1>
          <p className="mt-1 text-sm text-cairo-text/60">
            Los tipos de producto disponibles en la tienda.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex items-center gap-2 rounded-md bg-cairo-primary px-4 py-2 text-sm font-medium text-cairo-bg transition-all duration-200 ease-in-out hover:opacity-90"
        >
          {/* Fixed-size icon container: both icons are always mounted and
              cross-fade via opacity/scale, instead of an abrupt conditional
              swap, so the icon never causes a layout shift that pushes the
              label text next to it. */}
          <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
            <Plus
              className={`absolute h-4 w-4 transition-all duration-200 ease-in-out ${
                isOpen ? "scale-50 opacity-0" : "scale-100 opacity-100"
              }`}
            />
            <X
              className={`absolute h-4 w-4 transition-all duration-200 ease-in-out ${
                isOpen ? "scale-100 opacity-100" : "scale-50 opacity-0"
              }`}
            />
          </span>
          {isOpen ? "Cancelar" : "Nueva categoría"}
        </button>
      </div>

      {isOpen && (
        <Card className="mt-4 px-6 py-5">
          <AddCategoryForm onCreated={() => setIsOpen(false)} />
        </Card>
      )}
    </div>
  );
}
