"use client";

import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "@/types";

interface HeroSliderProps {
  slides: HeroSlide[];
}

const AUTOPLAY_INTERVAL_MS = 6000;

/**
 * Full-width hero carousel for the storefront home page, built on Embla.
 * Purely presentational: `slides` comes from the admin-managed
 * `hero_slides` table (see `getActiveHeroSlides`), so this component only
 * renders whatever it's given — including a slide with no title/subtitle,
 * or no button at all, hiding each piece elegantly instead of leaving a gap.
 */
export function HeroSlider({ slides }: HeroSliderProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: slides.length > 1 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Keep the dot indicators in sync with Embla's internal scroll state.
  useEffect(() => {
    if (!emblaApi) return;

    const handleSelect = (): void => setSelectedIndex(emblaApi.selectedScrollSnap());

    emblaApi.on("select", handleSelect);
    handleSelect();

    return () => {
      emblaApi.off("select", handleSelect);
    };
  }, [emblaApi]);

  // Auto-advance slides on a fixed interval; manual drag/arrow interaction
  // still works since Embla's `loop` option keeps scrolling consistent.
  // Skipped entirely with 0-1 slides — there's nothing to advance to.
  useEffect(() => {
    if (!emblaApi || slides.length <= 1) return;

    const intervalId = window.setInterval(() => {
      emblaApi.scrollNext();
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [emblaApi, slides.length]);

  // No active slides configured in the admin panel — render nothing rather
  // than an empty/broken carousel shell.
  if (slides.length === 0) return null;

  return (
    <section className="relative h-[80vh] w-full overflow-hidden">
      <div ref={emblaRef} className="h-full w-full">
        <div className="flex h-full">
          {slides.map((slide, index) => {
            const hasButton = !!slide.buttonText && !!slide.buttonLink;

            return (
              <div key={slide.id} className="relative flex h-full min-w-0 flex-[0_0_100%] items-center">
                <Image
                  src={slide.imageUrl}
                  alt={slide.title ?? ""}
                  fill
                  priority={index === 0}
                  className="object-cover"
                />
                {/* Darkens the admin-uploaded photo just enough to keep the text
                    overlay legible regardless of how bright/busy the image is. */}
                <div className="absolute inset-0 bg-black/30" />

                <div className="relative z-10 mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16">
                  <div className="max-w-xl">
                    {slide.title && (
                      <h1 className="font-heading text-5xl leading-tight text-white sm:text-6xl">
                        {slide.title}
                      </h1>
                    )}
                    {slide.subtitle && (
                      <p className="mt-5 text-base text-white/90 sm:text-lg">{slide.subtitle}</p>
                    )}
                    {hasButton && (
                      <Link
                        href={slide.buttonLink!}
                        className="mt-8 inline-flex items-center justify-center rounded-full bg-cairo-primary px-8 py-3 text-sm font-semibold tracking-wide text-cairo-bg transition-colors hover:bg-cairo-primary/90"
                      >
                        {slide.buttonText}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prev/next + dot controls only make sense with more than one slide. */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={scrollPrev}
            className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cairo-bg/80 text-cairo-text transition-colors hover:bg-cairo-bg sm:left-8"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={scrollNext}
            className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-cairo-bg/80 text-cairo-text transition-colors hover:bg-cairo-bg sm:right-8"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => scrollTo(index)}
                className={`h-2 rounded-full transition-all ${
                  index === selectedIndex ? "w-6 bg-cairo-primary" : "w-2 bg-cairo-text/30"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
