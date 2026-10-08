"use client";

import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  // Placeholder brand-colored background until real lifestyle photography is
  // available. Swap for a full-bleed `<Image fill>` layer per slide once
  // final product photography is ready, keeping the text overlay as-is.
  backgroundClassName: string;
}

const AUTOPLAY_INTERVAL_MS = 6000;

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "carteras",
    eyebrow: "Nueva temporada",
    title: "Carteras que te acompañan",
    subtitle:
      "Diseños versátiles para el día a día, pensados para la mujer argentina.",
    ctaLabel: "Ver Colección",
    ctaHref: "/catalogo",
    backgroundClassName: "bg-cairo-accent-yellow",
  },
  {
    id: "minibags",
    eyebrow: "Edición limitada",
    title: "Minibags con carácter",
    subtitle:
      "El accesorio perfecto para cada salida, en los colores de la temporada.",
    ctaLabel: "Comprar Ahora",
    ctaHref: "/catalogo",
    backgroundClassName: "bg-cairo-accent-blue",
  },
  {
    id: "collares",
    eyebrow: "Favoritos",
    title: "Collares que hablan por vos",
    subtitle: "Piezas delicadas para combinar con cualquier look.",
    ctaLabel: "Ver Colección",
    ctaHref: "/catalogo",
    backgroundClassName: "bg-cairo-accent-yellow",
  },
];

/** Full-width hero carousel for the storefront home page, built on Embla. */
export function HeroSlider() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
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
  useEffect(() => {
    if (!emblaApi) return;

    const intervalId = window.setInterval(() => {
      emblaApi.scrollNext();
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [emblaApi]);

  return (
    <section className="relative h-[80vh] w-full overflow-hidden">
      <div ref={emblaRef} className="h-full w-full">
        <div className="flex h-full">
          {HERO_SLIDES.map((slide) => (
            <div
              key={slide.id}
              className={`relative flex h-full min-w-0 flex-[0_0_100%] items-center ${slide.backgroundClassName}`}
            >
              <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16">
                <div className="max-w-xl">
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-cairo-text/70">
                    {slide.eyebrow}
                  </p>
                  <h1 className="mt-4 font-heading text-5xl leading-tight text-cairo-text sm:text-6xl">
                    {slide.title}
                  </h1>
                  <p className="mt-5 text-base text-cairo-text/80 sm:text-lg">
                    {slide.subtitle}
                  </p>
                  <Link
                    href={slide.ctaHref}
                    className="mt-8 inline-flex items-center justify-center rounded-full bg-cairo-primary px-8 py-3 text-sm font-semibold tracking-wide text-cairo-bg transition-colors hover:bg-cairo-primary/90"
                  >
                    {slide.ctaLabel}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prev / next controls */}
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

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {HERO_SLIDES.map((slide, index) => (
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
    </section>
  );
}
