"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/types";
import { deleteCategory, updateCategory } from "@/app/admin/categories/actions";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface CategoryRowActionsProps {
  category: Category;
}

/**
 * Inline edit/delete controls for a single row in the admin categories
 * table. Editing swaps the name cell for a text input in place rather than
 * navigating to a separate page — categories only have one editable field,
 * so a dedicated edit route would be unnecessary overhead.
 */
export function CategoryRowActions({ category }: CategoryRowActionsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);
  // `isPending` keeps the Server Action call off the main thread (no frozen
  // UI while the Edge round-trip is in flight) and drives the save/delete
  // buttons' disabled/spinner state below. Shared across both flows, since
  // only one of them can be active for this row at a time.
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  function handleSave(): void {
    setError(null);

    startTransition(async () => {
      const result = await updateCategory(category.id, name);

      if (result.error) {
        setError(result.error);
        return;
      }

      setIsEditing(false);
      router.refresh();
    });
  }

  function handleConfirmDelete(): void {
    startTransition(async () => {
      const result = await deleteCategory(category.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Categoría eliminada.");
      setIsModalOpen(false);
      router.refresh();
    });
  }

  const confirmDeleteModal = (
    <ConfirmModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onConfirm={handleConfirmDelete}
      title="Eliminar categoría"
      message={`¿Eliminar "${category.name}"? Los productos de esta categoría quedarán sin categoría.`}
      confirmText="Eliminar"
      isLoading={isPending}
    />
  );

  if (isEditing) {
    return (
      <td colSpan={2} className="py-4 pl-6 pr-8">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            className="flex-1 rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-1.5 text-sm text-cairo-text outline-none focus:border-cairo-primary"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            aria-label="Guardar"
            className="rounded-md bg-cairo-primary p-2 text-cairo-bg transition-colors duration-200 hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setName(category.name);
              setError(null);
            }}
            aria-label="Cancelar"
            className="rounded-md border border-cairo-text/20 p-2 text-cairo-text/70 transition-colors duration-200 hover:text-cairo-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {confirmDeleteModal}
      </td>
    );
  }

  return (
    <>
      <td className="px-6 py-4 font-medium text-cairo-text">{category.name}</td>
      <td className="py-4 pl-6 pr-8 text-cairo-text/70">
        <div className="flex items-center justify-between gap-4">
          <span className="truncate">{category.slug}</span>
          {/* Fixed `h-10` keeps the row height stable as the edit/delete icons' hover states
              toggle; no fixed width here so the box never overflows past the cell's `pr-8`
              padding (the icon buttons' own size is all the width this box needs). */}
          <div className="flex h-10 items-center gap-4">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label="Editar categoría"
              className="rounded-md p-2 text-cairo-text/50 transition-colors duration-200 hover:bg-cairo-accent-blue/30 hover:text-cairo-primary"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              aria-label="Eliminar categoría"
              className="rounded-md p-2 text-cairo-text/50 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </td>
      {confirmDeleteModal}
    </>
  );
}
