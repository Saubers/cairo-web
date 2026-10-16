"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useState, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductImage } from "@/components/storefront/ProductImage";

interface ProductImageCarouselProps {
  images: string[];
  alt: string;
  /** Marks this card's first slide as the LCP image (set only on the first above-the-fold card). */
  priority?: boolean;
}

/**
 * Interactive image carousel embedded in a `ProductCard`.
 *
 * On desktop, prev/next arrows are hidden until the card is hovered
 * (`group-hover`, relying on the ancestor `.group` set by `ProductCard`).
 * On mobile/touch, arrows are always visible, and native swipe/drag is
 * handled by Embla regardless of visibility. Extracted as its own Client
 * Component so `ProductCard` itself can stay a Server Component.
 */
export function ProductImageCarousel({ images, alt, priority = false }: ProductImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;

    const updateScrollState = (): void => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };

    emblaApi.on("select", updateScrollState);
    emblaApi.on("reInit", updateScrollState);
    updateScrollState();

    return () => {
      emblaApi.off("select", updateScrollState);
      emblaApi.off("reInit", updateScrollState);
    };
  }, [emblaApi]);

  // Arrows live inside the card's `<Link>` overlay — stop the click from
  // bubbling up and navigating away from the card.
  function handlePrev(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    emblaApi?.scrollPrev();
  }

  function handleNext(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    emblaApi?.scrollNext();
  }

  if (images.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-cairo-text/40">
        Sin imagen
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={emblaRef} className="h-full w-full overflow-hidden">
        <div className="flex h-full">
          {images.map((src, index) => (
            <div key={src} className="relative h-full min-w-0 flex-[0_0_100%]">
              <ProductImage
                src={src}
                alt={`${alt} ${index + 1}`}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                priority={priority && index === 0}
              />
            </div>
          ))}
        </div>
      </div>

      {images.length > 1 && (
        <>
          {canScrollPrev && (
            <button
              type="button"
              aria-label="Previous image"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-cairo-bg/80 text-cairo-text opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {canScrollNext && (
            <button
              type="button"
              aria-label="Next image"
              onClick={handleNext}
              className="absolute right-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-cairo-bg/80 text-cairo-text opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
