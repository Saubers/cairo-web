"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { moveHeroSlide } from "@/app/admin/carousel/actions";

interface MoveHeroSlideButtonsProps {
  slideId: string;
  /** Disables the "up" control — this slide is already first in the carousel. */
  isFirst: boolean;
  /** Disables the "down" control — this slide is already last in the carousel. */
  isLast: boolean;
}

/** Up/down reordering controls for a single row in the admin carousel table. */
export function MoveHeroSlideButtons({ slideId, isFirst, isLast }: MoveHeroSlideButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleMove(direction: "up" | "down"): void {
    startTransition(async () => {
      const result = await moveHeroSlide(slideId, direction);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="inline-flex flex-col">
      <button
        type="button"
        onClick={() => handleMove("up")}
        disabled={isFirst || isPending}
        aria-label="Subir slide"
        className="rounded p-0.5 text-cairo-text/50 transition-colors duration-200 hover:text-cairo-primary disabled:pointer-events-none disabled:opacity-25"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => handleMove("down")}
        disabled={isLast || isPending}
        aria-label="Bajar slide"
        className="rounded p-0.5 text-cairo-text/50 transition-colors duration-200 hover:text-cairo-primary disabled:pointer-events-none disabled:opacity-25"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}
