"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleHeroSlideActive } from "@/app/admin/carousel/actions";

interface HeroSlideActiveToggleProps {
  slideId: string;
  isActive: boolean;
}

/**
 * Quick active/inactive switch for a single row in the admin carousel table.
 *
 * Uses `useOptimistic` so the thumb flips instantly on click instead of
 * waiting on the Server Action's round-trip. If the action fails, no new
 * value is ever committed (the `isActive` prop coming from the server never
 * changes), so React automatically reverts the optimistic value back to it
 * once the transition settles — the toast is the only explicit "undo" the
 * admin sees.
 */
export function HeroSlideActiveToggle({ slideId, isActive }: HeroSlideActiveToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticActive, setOptimisticActive] = useOptimistic(isActive);

  function handleToggle(): void {
    const nextActive = !optimisticActive;

    startTransition(async () => {
      setOptimisticActive(nextActive);

      const result = await toggleHeroSlideActive(slideId, nextActive);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      role="switch"
      aria-checked={optimisticActive}
      aria-label={optimisticActive ? "Desactivar slide" : "Activar slide"}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-all duration-300 ease-in-out disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cairo-primary/30 ${
        optimisticActive ? "bg-cairo-primary" : "bg-cairo-text/20"
      }`}
    >
      {/* `left-0.5` gives the thumb an explicit resting position (instead of
          relying on the browser's "static position" fallback for an
          unset `left`), so the `translate-x-*` pair below moves it between
          two well-defined points rather than compounding on an undefined
          base — this was the root cause of the thumb losing its shape. */}
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ease-in-out ${
          optimisticActive ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
