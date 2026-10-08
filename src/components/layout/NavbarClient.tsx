"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Menu, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { NavDrawer } from "@/components/layout/NavDrawer";
import { UserMenu } from "@/components/layout/UserMenu";

/** Scroll distance, in pixels, after which the navbar collapses to its compact state. */
const SCROLL_COLLAPSE_THRESHOLD_PX = 80;

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/colecciones", label: "Colecciones" },
  { href: "#contacto", label: "Contacto" },
];

interface NavbarClientProps {
  user: User | null;
  /** The user's display name, resolved from `profiles.full_name` by the `Navbar` Server Component. */
  fullName: string | null;
}

/**
 * Interactive shell of the Navbar (scroll-collapse, drawer, cart badge).
 * Receives `user` from the `Navbar` Server Component so the account
 * icon/menu can render synchronously with the correct state — no client
 * session check or loading placeholder needed.
 */
export function NavbarClient({ user, fullName }: NavbarClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sum item quantities for the cart badge. Selecting only `items` keeps the
  // subscription minimal; the sum itself is cheap to recompute on change.
  const totalItems = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  useEffect(() => {
    function handleScroll(): void {
      setIsCollapsed(window.scrollY > SCROLL_COLLAPSE_THRESHOLD_PX);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-cairo-text/10 bg-cairo-bg/95 backdrop-blur">
        <nav
          className={`mx-auto grid max-w-7xl grid-cols-3 items-center px-4 transition-[height] duration-300 sm:px-6 lg:px-8 ${
            isCollapsed ? "h-14" : "h-20"
          }`}
        >
          {/* Left: hamburger trigger for the sliding navigation drawer */}
          <div className="flex items-center justify-start">
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={isDrawerOpen}
              onClick={() => setIsDrawerOpen(true)}
              className="text-cairo-text transition-colors hover:text-cairo-primary"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          {/* Center: logo. Full wordmark (logo-cairo.svg) on desktop while
              expanded; simplified isotype (iso-cereza.svg) on mobile (always)
              or once the navbar collapses on scroll (desktop). `unoptimized`
              is used because these are trusted static SVG brand assets —
              Next.js' image optimizer does not process SVGs, so optimization
              adds no value and would otherwise require dangerouslyAllowSVG.
              Both desktop images are permanently mounted and only cross-fade
              via opacity/scale ("absolute swap" pattern) instead of being
              conditionally rendered — a ternary here previously swapped the
              wordmark (120x48) for the isotype (36x36), and the resulting
              width change caused a layout shift that pushed the hamburger
              and cart icons on every scroll-collapse transition. */}
          <Link href="/" aria-label="Cairo home" className="flex items-center justify-center">
            <span className="relative hidden items-center justify-center md:flex">
              {/* Wordmark stays in normal flow, so it alone dictates the
                  container's width/height — only its opacity/scale animate. */}
              <Image
                src="/logo/logo-cairo.svg"
                alt="Cairo"
                width={120}
                height={48}
                priority
                unoptimized
                className={`transition-all duration-300 ease-in-out ${
                  isCollapsed ? "scale-95 opacity-0 select-none" : "scale-100 opacity-100"
                }`}
              />
              {/* Isotype is taken out of flow (`absolute`) so it never
                  affects the container's size, and centered over it. */}
              <Image
                src="/logo/iso-cereza.svg"
                alt="Cairo"
                width={36}
                height={36}
                priority
                unoptimized
                className={`absolute inset-0 m-auto transition-all duration-300 ease-in-out ${
                  isCollapsed ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
                }`}
              />
            </span>
            <span className="md:hidden">
              <Image
                src="/logo/iso-cereza.svg"
                alt="Cairo"
                width={36}
                height={36}
                priority
                unoptimized
              />
            </span>
          </Link>

          {/* Right: account access and shopping cart */}
          <div className="flex items-center justify-end gap-5">
            <UserMenu user={user} fullName={fullName} />
            <Link
              href="/carrito"
              aria-label="Shopping cart"
              className="relative flex items-center text-cairo-text transition-colors hover:text-cairo-primary"
            >
              <ShoppingBag className="h-6 w-6" />
              {totalItems > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-cairo-primary text-xs font-semibold text-cairo-bg">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </nav>
      </header>

      <NavDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        links={NAV_LINKS}
      />
    </>
  );
}
