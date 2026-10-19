"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleHeroSlideActive } from "@/app/admin/carousel/actions";

interface HeroSlideActiveToggleProps {
  slideId: string;
  isActive: boolean;
}

/** Quick active/inactive switch for a single row in the admin carousel table. */
export function HeroSlideActiveToggle({ slideId, isActive }: HeroSlideActiveToggleProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleToggle(): Promise<void> {
    setIsSaving(true);
    const result = await toggleHeroSlideActive(slideId, !isActive);
    setIsSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isSaving}
      role="switch"
      aria-checked={isActive}
      aria-label={isActive ? "Desactivar slide" : "Activar slide"}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-all duration-300 ease-in-out disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cairo-primary/30 ${
        isActive ? "bg-cairo-primary" : "bg-cairo-text/20"
      }`}
    >
      {/* `left-0.5` gives the thumb an explicit resting position (instead of
          relying on the browser's "static position" fallback for an
          unset `left`), so the `translate-x-*` pair below moves it between
          two well-defined points rather than compounding on an undefined
          base — this was the root cause of the thumb losing its shape. */}
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ease-in-out ${
          isActive ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
