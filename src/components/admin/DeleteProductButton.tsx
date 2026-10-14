"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProduct } from "@/app/admin/products/actions";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface DeleteProductButtonProps {
  productId: string;
  productName: string;
}

/** Confirm-then-delete control for a single row in the admin products table. */
export function DeleteProductButton({ productId, productName }: DeleteProductButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirmDelete(): Promise<void> {
    setIsDeleting(true);
    const result = await deleteProduct(productId);

    if (result.error) {
      toast.error(result.error);
      setIsDeleting(false);
      return;
    }

    toast.success("Producto eliminado.");
    setIsModalOpen(false);
    setIsDeleting(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label="Eliminar producto"
        className="rounded-md p-2 text-cairo-text/50 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar producto"
        message={`¿Eliminar "${productName}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isLoading={isDeleting}
      />
    </>
  );
}
