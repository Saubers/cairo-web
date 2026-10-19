"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteHeroSlide } from "@/app/admin/carousel/actions";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface DeleteHeroSlideButtonProps {
  slideId: string;
  slideTitle: string;
}

/** Confirm-then-delete control for a single row in the admin carousel table. */
export function DeleteHeroSlideButton({ slideId, slideTitle }: DeleteHeroSlideButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirmDelete(): Promise<void> {
    setIsDeleting(true);
    const result = await deleteHeroSlide(slideId);

    if (result.error) {
      toast.error(result.error);
      setIsDeleting(false);
      return;
    }

    toast.success("Slide eliminado.");
    setIsModalOpen(false);
    setIsDeleting(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        aria-label="Eliminar slide"
        className="rounded-md p-2 text-cairo-text/50 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar slide"
        message={`¿Eliminar "${slideTitle || "este slide"}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isLoading={isDeleting}
      />
    </>
  );
}
