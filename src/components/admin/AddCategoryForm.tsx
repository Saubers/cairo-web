"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createCategory } from "@/app/admin/categories/actions";

interface AddCategoryFormProps {
  /** Called after a successful create, so the parent can collapse the panel. */
  onCreated?: () => void;
}

/** Minimal "add category" form used on the admin categories page. */
export function AddCategoryForm({ onCreated }: AddCategoryFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await createCategory(name);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setName("");
    setIsSubmitting(false);
    toast.success("Categoría creada.");
    router.refresh();
    onCreated?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-3">
      <div className="flex-1">
        <label htmlFor="category-name" className="block text-sm font-medium text-cairo-text">
          Nombre de la categoría
        </label>
        <input
          id="category-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej. Carteras"
          required
          className="mt-1 w-full rounded-md border border-cairo-text/20 bg-cairo-bg px-3 py-2 text-sm text-cairo-text outline-none focus:border-cairo-primary"
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 flex items-center gap-2 rounded-md bg-cairo-primary px-4 py-2 text-sm font-medium text-cairo-bg transition-all duration-200 ease-in-out hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "Agregando..." : "Agregar"}
      </button>
    </form>
  );
}
