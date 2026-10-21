import type { Metadata } from "next";
import { Toaster } from "sonner";
import { bagdoll, headlineSans } from "@/lib/fonts";
import { getStoreSettings } from "@/services/storeSettingsService";
import { StoreSettingsProvider } from "@/providers/StoreSettingsProvider";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { NavbarClient } from "@/components/layout/NavbarClient";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SITE_DESCRIPTION = "Carteras, minibags, totebags y collares. Envíos a todo Argentina.";

export const metadata: Metadata = {
  // Base URL every relative `openGraph.images`/canonical URL is resolved
  // against (including the ones set per-page via `generateMetadata`).
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Cairo | Accesorios Premium",
    // Lets page-level metadata set only the product/page name, e.g.
    // "Cartera Luna | Cairo", via `title: { template }`.
    template: "%s | Cairo",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: "Cairo",
    title: "Cairo | Accesorios Premium",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "es_AR",
    type: "website",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // [PERF] `getStoreSettings()` is served from a module-scoped, in-memory
  // TTL cache (see `storeSettingsService.ts`), so this resolves without a
  // Supabase round-trip on every request except a rare cache miss (cold
  // start, past the TTL, or right after an admin save). That distinction
  // matters specifically because this runs in `RootLayout`, i.e. on every
  // single route in the app: an uncached await here previously added a live
  // DB round-trip to every page load site-wide, which is what tripped
  // Cloudflare's Worker CPU/wall-time limit (error 1102). Every client
  // component downstream still reads the real, admin-configured shipping
  // settings through `StoreSettingsProvider` from its very first render —
  // no client fetch, no default-then-real flash, no hydration mismatch.
  const storeSettings = await getStoreSettings();

  return (
    <html lang="es-AR" className={`${bagdoll.variable} ${headlineSans.variable} antialiased`}>
      {/* Keep this class list minimal and scroll-safe: no `overflow-*`/`h-screen`/`overscroll-*`
          utility here has ever been required for the layout to work, and any of them risks
          accidentally disabling the page's native wheel/touch scroll.
          Scroll anchoring and smooth-scroll are disabled globally in globals.css (on `html` AND
          `body` — `html` is this app's real scrolling box, so a `body`-only rule isn't enough),
          not here, to keep a single source of truth. */}
      <body className="flex min-h-screen flex-col bg-cairo-bg font-sans text-cairo-text">
        <StoreSettingsProvider
          initialSettings={{
            freeShippingThreshold: storeSettings.freeShippingThreshold,
            flatShippingRate: storeSettings.flatShippingRate,
            localPostalCode: storeSettings.localPostalCode,
            shippingCostLocal: storeSettings.shippingCostLocal,
            shippingCostNear: storeSettings.shippingCostNear,
            shippingCostFar: storeSettings.shippingCostFar,
          }}
        >
          <AnnouncementBar />
          <NavbarClient />
          <main className="flex w-full flex-1 flex-col">{children}</main>
          <Footer />
          {/* Floating feedback for every mutation (login, logout, admin CRUD, order
              status updates) — replaces native alerts and static inline banners. */}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast: "rounded-lg border border-cairo-text/10 bg-cairo-bg font-sans shadow-lg",
                title: "text-cairo-text font-medium",
                description: "text-cairo-text/70",
              },
            }}
          />
        </StoreSettingsProvider>
      </body>
    </html>
  );
}
