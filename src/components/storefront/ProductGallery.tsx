"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductImage } from "@/components/storefront/ProductImage";

interface ProductGalleryProps {
  images: string[];
  alt: string;
}

/**
 * Large image gallery for the product detail page. Swipeable on touch
 * (native Embla drag) and arrow/dot-navigable on desktop. Extracted as a
 * Client Component so the detail page itself stays a Server Component.
 */
export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: images.length > 1 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const handleSelect = (): void => setSelectedIndex(emblaApi.selectedScrollSnap());

    emblaApi.on("select", handleSelect);
    handleSelect();

    return () => {
      emblaApi.off("select", handleSelect);
    };
  }, [emblaApi]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-cairo-accent-yellow/40 text-sm text-cairo-text/40">
        Sin imagen
      </div>
    );
  }

  return (
    // `group` wraps the whole gallery so `ProductImage`'s hover lift (on the main slide below)
    // reacts to hovering anywhere over this block, not just the exact pixels of the photo.
    <div className="group relative w-full min-w-0">
      {/* Strict `aspect-square` + `max-w-full` instead of a fixed `h-[...]` — the box is always
          exactly as tall as it is wide, so it scales down cleanly on any mobile viewport instead
          of blowing out to a fixed pixel height. `bg-transparent` (not a tinted box) lets a
          calado product photo blend into the page's cream background instead of sitting on a
          visible "patch". */}
      <div ref={emblaRef} className="relative aspect-square w-full max-w-full overflow-hidden rounded-lg bg-transparent">
        <div className="flex h-full">
          {images.map((src, index) => (
            <div key={src} className="relative h-full min-w-0 flex-[0_0_100%]">
              <ProductImage
                src={src}
                alt={`${alt} ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={scrollPrev}
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-cairo-bg/80 text-cairo-text transition-colors hover:bg-cairo-bg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={scrollNext}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-cairo-bg/80 text-cairo-text transition-colors hover:bg-cairo-bg"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Thumbnail strip: horizontally scrollable with snap-to-start, so it works as a
              touch-friendly swipeable pagination on mobile instead of just a static dot row.
              `w-full` caps the strip at the gallery's own width (it never forces the grid item
              wider), and every thumbnail below is `shrink-0` with a fixed size — without that,
              a flex row this long would compress/stretch each thumbnail instead of scrolling. */}
          <div className="mt-3 flex w-full gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                aria-label={`Go to image ${index + 1}`}
                onClick={() => scrollTo(index)}
                className={`relative h-20 w-20 shrink-0 snap-start overflow-hidden rounded-md border-2 transition-colors sm:h-24 sm:w-24 ${
                  index === selectedIndex ? "border-cairo-primary" : "border-transparent"
                }`}
              >
                <ProductImage
                  src={src}
                  alt={`${alt} thumbnail ${index + 1}`}
                  fill
                  sizes="96px"
                  hoverLift={false}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
