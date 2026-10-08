"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCollection } from "@/app/admin/collections/actions";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface DeleteCollectionButtonProps {
  collectionId: string;
  collectionName: string;
}

/** Confirm-then-delete control for a single row in the admin collections table. */
export function DeleteCollectionButton({
  collectionId,
  collectionName,
}: DeleteCollectionButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirmDelete(): Promise<void> {
    setIsDeleting(true);
    const result = await deleteCollection(collectionId);

    if (result.error) {
      toast.error(result.error);
      setIsDeleting(false);
      return;
    }

    toast.success("Colección eliminada.");
    setIsModalOpen(false);
    setIsDeleting(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label="Eliminar colección"
        className="rounded-md p-1.5 text-cairo-text/50 transition-all duration-200 ease-in-out hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar colección"
        message={`¿Eliminar "${collectionName}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isLoading={isDeleting}
      />
    </>
  );
}
