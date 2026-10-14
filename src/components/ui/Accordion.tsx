"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface AccordionItemData {
  title: string;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItemData[];
  /** Index of the item expanded by default. `null` (the default) collapses all items. */
  defaultOpenIndex?: number | null;
}

/**
 * Collapsible list of sections, used on the product detail page for
 * "Detalles y Materiales" / "Cuidados del Accesorio" / "Envíos y
 * Devoluciones".
 *
 * Built with fully controlled React state instead of the native
 * `<details>`/`<summary>` elements: browsers apply their own, non-
 * overridable scroll-into-view when a native `<details>` expands and its
 * content would otherwise overflow the viewport — which is exactly what
 * happens with the last accordion, right next to the footer. A controlled
 * `<button>` plus a CSS-Grid height animation gives the same disclosure UI
 * without that unwanted browser-driven scroll.
 */
export function Accordion({ items, defaultOpenIndex = null }: AccordionProps) {
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(
    () => new Set(defaultOpenIndex === null ? [] : [defaultOpenIndex]),
  );

  function toggleIndex(index: number): void {
    setOpenIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <div className="divide-y divide-cairo-text/10 border-y border-cairo-text/10">
      {items.map((item, index) => {
        const isOpen = openIndexes.has(index);

        return (
          <div key={item.title} className="py-4">
            <button
              type="button"
              onClick={() => toggleIndex(index)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-center justify-between text-left text-sm font-medium text-cairo-text"
            >
              {item.title}
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-cairo-text/50 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* CSS-Grid height animation: animating `grid-template-rows` from `0fr` to `1fr`
                transitions height smoothly without ever needing `height: auto` (which can't be
                animated) or a measured pixel height. `overflow-hidden` on the inner wrapper
                clips the content while it's collapsing/expanding. */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="mt-3 text-sm leading-relaxed text-cairo-text/60">{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
