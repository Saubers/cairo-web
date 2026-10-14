"use client";

import { usePathname } from "next/navigation";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const CURRENCY_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/**
 * Global announcement bar rendered above the Navbar. Reads the live
 * `free_shipping_threshold` from `store_settings` instead of a hardcoded
 * amount, so it always matches what the cart/checkout actually charge.
 *
 * Returns `null` on every `/admin` route: the backoffice doesn't need this
 * banner, and rendering it there was also what broke `AdminShell`'s
 * `h-screen`-based sidebar layout (the banner ate into that viewport-height
 * budget). Hiding it here fixes the layout without `AdminShell` needing to
 * know about this component at all.
 */
export function AnnouncementBar() {
  const pathname = usePathname();
  const { freeShippingThreshold } = useStoreSettings();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="bg-cairo-primary px-4 py-2 text-center text-xs font-medium tracking-wide text-cairo-bg sm:text-sm">
      Envío gratis a todo el país en compras superiores a {CURRENCY_FORMATTER.format(freeShippingThreshold)}
    </div>
  );
}
