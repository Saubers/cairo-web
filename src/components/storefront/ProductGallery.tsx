"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
    <div className="relative">
      <div ref={emblaRef} className="aspect-square w-full overflow-hidden rounded-lg bg-cairo-accent-yellow/40">
        <div className="flex h-full">
          {images.map((src, index) => (
            <div key={src} className="relative h-full min-w-0 flex-[0_0_100%]">
              <Image
                src={src}
                alt={`${alt} ${index + 1}`}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority={index === 0}
                className="object-cover"
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

          <div className="mt-3 flex justify-center gap-2">
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                aria-label={`Go to image ${index + 1}`}
                onClick={() => scrollTo(index)}
                className={`h-2 rounded-full transition-all ${
                  index === selectedIndex ? "w-6 bg-cairo-primary" : "w-2 bg-cairo-text/30"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
