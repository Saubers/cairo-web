"use client";

import { usePathname } from "next/navigation";
import { ContactSection } from "@/components/storefront/ContactSection";

/**
 * Global footer wrapper, rendered once in the root layout instead of being
 * embedded page-by-page. Returns `null` on every `/admin` route — the
 * backoffice has no use for the public contact footer — matching the same
 * pathname-based opt-out already used by `AnnouncementBar` and the
 * Navbar's hamburger trigger.
 */
export function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return <ContactSection />;
}
