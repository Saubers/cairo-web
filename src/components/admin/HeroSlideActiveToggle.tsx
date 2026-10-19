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
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out disabled:opacity-50 ${
        isActive ? "bg-cairo-primary" : "bg-cairo-text/20"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
          isActive ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
