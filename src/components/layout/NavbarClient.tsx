"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Menu, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

/**
 * Client-resolved auth state for the account icon/menu. `status: "loading"`
 * is what renders on both the server (this component is "use client", but
 * Next.js still renders it once server-side for the initial HTML) and the
 * client's first paint — identical on both sides, so there is no hydration
 * mismatch — until the effect below resolves the real session.
 */
interface AuthState {
  status: "loading" | "resolved";
  user: User | null;
  fullName: string | null;
}

const INITIAL_AUTH_STATE: AuthState = { status: "loading", user: null, fullName: null };

/**
 * Interactive shell of the Navbar (scroll-collapse, drawer, cart badge,
 * account state). A pure Client Component: no `cookies()`/server Supabase
 * client anywhere in this tree, so mounting it never forces the root layout
 * (and therefore every public page under it) into dynamic SSR. The account
 * icon/menu resolves its own session client-side via the browser Supabase
 * client, trading a brief loading placeholder (see `UserMenu`) for a fully
 * static-renderable shell.
 */
export function NavbarClient() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>(INITIAL_AUTH_STATE);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    // `full_name` lives in `profiles`, not in the auth user's metadata — the
    // "Mi Cuenta" edit flow only ever writes to `profiles.full_name`, so
    // that table (not `user.user_metadata`, which would go stale after an
    // edit) is the single source of truth for the greeting shown in
    // `UserMenu`.
    async function resolveAuth(user: User | null): Promise<void> {
      if (!user) {
        if (isMounted) setAuth({ status: "resolved", user: null, fullName: null });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle<{ full_name: string | null }>();

      if (isMounted) setAuth({ status: "resolved", user, fullName: profile?.full_name ?? null });
    }

    supabase.auth.getUser().then(({ data: { user } }) => resolveAuth(user));

    // Keeps the account icon in sync with login/logout happening in this tab
    // (or another tab sharing the same browser storage) without a reload.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveAuth(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // The admin backoffice (`AdminShell`) has its own sidebar/topbar
  // navigation — the public drawer trigger would be redundant (and
  // visually conflicting) there, so it's hidden on every `/admin` route.
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;

  // Sum item quantities for the cart badge. Selecting only `items` keeps the
  // subscription minimal; the sum itself is cheap to recompute on change.
  const totalItems = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );
  // Gates the badge until the `persist` middleware has rehydrated from
  // `localStorage` (see `useCartStore`), so a returning visitor never sees
  // the badge flash from empty to their real cart count right after mount.
  const hasHydrated = useCartStore((state) => state.hasHydrated);

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
          {/* Left: the hamburger trigger is now the only navigation entry
              point on the public storefront — the text nav links were
              removed in favor of a single `NavDrawer`-driven menu at every
              breakpoint. Still hidden on `/admin` routes, which have their
              own sidebar navigation. */}
          <div className="flex items-center justify-start">
            {!isAdminRoute && (
              <button
                type="button"
                aria-label="Open navigation menu"
                aria-expanded={isDrawerOpen}
                onClick={() => setIsDrawerOpen(true)}
                className="text-cairo-text transition-colors hover:text-cairo-primary"
              >
                <Menu className="h-6 w-6" />
              </button>
            )}
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
            <UserMenu
              user={auth.user}
              fullName={auth.fullName}
              isLoading={auth.status === "loading"}
            />
            <Link
              href="/carrito"
              aria-label="Shopping cart"
              className="relative flex items-center text-cairo-text transition-colors hover:text-cairo-primary"
            >
              <ShoppingBag className="h-6 w-6" />
              {hasHydrated && totalItems > 0 && (
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
