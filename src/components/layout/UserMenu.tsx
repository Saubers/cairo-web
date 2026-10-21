"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { User as UserIcon, LayoutDashboard, ShoppingBag, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAdmin } from "@/hooks/useAdmin";
import { logout } from "@/app/auth/actions";
import { useCartStore } from "@/store/useCartStore";

interface UserMenuProps {
  user: User | null;
  /** The user's display name, resolved from `profiles.full_name` by `NavbarClient`. */
  fullName: string | null;
  /**
   * `true` while `NavbarClient` is still resolving the client-side session.
   * Renders a neutral placeholder instead of guessing "logged out" or
   * "logged in", avoiding both a misleading click target and a flash from
   * one state to the other right after mount.
   */
  isLoading: boolean;
}

/**
 * Account icon in the Navbar.
 *
 * `user`/`fullName` are resolved client-side by `NavbarClient` (via the
 * browser Supabase client) and passed down as props — this component itself
 * stays purely presentational, with three states: loading, logged out,
 * logged in.
 *
 * - `isLoading`: generic, non-interactive placeholder icon.
 * - `user` is `null`: plain link to `/auth/login`.
 * - `user` exists: opens a dropdown with account links + logout. `isAdmin`
 *   comes from `useAdmin` (a UX convenience only — the real admin gate is
 *   server-side, see that hook's docstring).
 */
export function UserMenu({ user, fullName, isLoading }: UserMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutSucceeded, setLogoutSucceeded] = useState(false);

  const { isAdmin } = useAdmin();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!isMenuOpen) return;

    function handleClickOutside(event: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  // Nuclear cache fix: a plain `router.refresh()`/`router.push()` pair still
  // goes through the Next.js client router, which was observed to keep
  // serving the previous user's role until a hard reload — relevant for any
  // still-mounted Server Component that read the session server-side (e.g.
  // the `/admin` layout's role check), since those won't re-run on a client-
  // only navigation. A full `window.location` navigation forces the browser
  // to discard the React tree entirely and request a brand-new document,
  // guaranteeing every such check re-reads the now-cleared session cookie.
  // The navigation itself is pushed into an effect because mutating
  // `window.location` is a side effect outside React's render/event model.
  useEffect(() => {
    if (logoutSucceeded) {
      window.location.href = "/";
    }
  }, [logoutSucceeded]);

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);

    // Zustand's `persist` middleware writes the cart to localStorage, which
    // otherwise survives across sessions — a logged-out visitor (or the next
    // account on a shared device) would still see the previous user's cart.
    // Clearing it here, before the session itself is torn down, guarantees a
    // clean slate.
    useCartStore.getState().clearCart();

    const result = await logout();

    if (result.error) {
      // Sign-out failed (e.g. network error) — bail out without navigating
      // so the user can retry.
      toast.error(result.error);
      setIsLoggingOut(false);
      return;
    }

    setIsMenuOpen(false);
    setLogoutSucceeded(true);
  }

  if (isLoading) {
    // Shown while the client-side session check is in flight — same icon as
    // the logged-out state visually, but not a link: we don't yet know
    // whether it should point to `/auth/login` or open the account menu, so
    // a non-interactive placeholder avoids a misleading click target.
    return (
      <span aria-hidden="true" className="flex items-center justify-center text-cairo-text/40">
        <UserIcon className="h-6 w-6" />
      </span>
    );
  }

  if (!user) {
    return (
      <Link
        href="/auth/login"
        aria-label="Account"
        className="flex items-center justify-center text-cairo-text transition-all duration-200 ease-in-out hover:text-cairo-primary"
      >
        <UserIcon className="h-6 w-6" />
      </Link>
    );
  }

  // Safe, single-character initial for the avatar — prefers the profile's
  // display name, falls back to the account email, and finally to a generic
  // placeholder so the avatar never renders empty.
  const initial = fullName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U";

  return (
    <div ref={menuRef} className="relative flex items-center">
      {/* `appearance-none p-0 leading-none` strip the browser's default
          form-control box model (native min-height/padding), which is what
          made this button sit a couple pixels higher than the plain `<Link>`
          above despite both only wrapping a 24px icon. The avatar circle
          (w-8 h-8) is sized to match that same footprint so there is no
          layout shift between the logged-out icon and the logged-in avatar. */}
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((current) => !current)}
        className="flex items-center justify-center appearance-none p-0 leading-none text-cairo-text transition-all duration-200 ease-in-out hover:text-cairo-primary"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cairo-primary text-sm font-medium text-cairo-bg">
          {initial}
        </span>
      </button>

      {isMenuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-3 w-56 rounded-md border border-cairo-text/10 bg-cairo-bg py-2 shadow-lg"
        >
          {/* Greeting header: welcomes the user by name (or a generic
              greeting if `profiles.full_name` hasn't been set yet) and shows
              the account email below it, separated from the clickable
              actions by a border. */}
          <div className="border-b border-cairo-text/10 px-4 pb-3">
            <p className="truncate text-sm font-semibold text-cairo-text">
              {fullName ? `Hola, ${fullName}` : "Hola"}
            </p>
            <p className="truncate text-xs text-cairo-text/50">{user.email}</p>
          </div>

          <Link
            href="/mi-cuenta"
            role="menuitem"
            onClick={() => setIsMenuOpen(false)}
            className="mt-2 flex items-center gap-3 px-4 py-2 text-sm text-cairo-text transition-all duration-200 ease-in-out hover:bg-cairo-accent-blue/30"
          >
            <UserIcon className="h-4 w-4" />
            Mi Cuenta
          </Link>

          <Link
            href="/mis-pedidos"
            role="menuitem"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-2 text-sm text-cairo-text transition-all duration-200 ease-in-out hover:bg-cairo-accent-blue/30"
          >
            <ShoppingBag className="h-4 w-4" />
            Mis Pedidos
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-cairo-text transition-all duration-200 ease-in-out hover:bg-cairo-accent-blue/30"
            >
              <LayoutDashboard className="h-4 w-4" />
              Panel Admin
            </Link>
          )}

          <div className="my-2 border-t border-cairo-text/10" />

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-cairo-text transition-all duration-200 ease-in-out hover:bg-cairo-accent-blue/30 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Saliendo..." : "Cerrar Sesión"}
          </button>
        </div>
      )}
    </div>
  );
}
