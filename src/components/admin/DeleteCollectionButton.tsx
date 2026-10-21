"use client";

import { useState, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();

  function handleConfirmDelete(): void {
    startTransition(async () => {
      const result = await deleteCollection(collectionId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Colección eliminada.");
      setIsModalOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label="Eliminar colección"
        className="rounded-md p-2 text-cairo-text/50 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
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
        isLoading={isPending}
      />
    </>
  );
}
