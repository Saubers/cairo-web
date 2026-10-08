import type { Metadata } from "next";
import { Toaster } from "sonner";
import { bagdoll, headlineSans } from "@/lib/fonts";
import { Navbar } from "@/components/layout/Navbar";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SITE_DESCRIPTION = "Carteras, minibags, totebags y collares. Envíos a todo Argentina.";

export const metadata: Metadata = {
  // Base URL every relative `openGraph.images`/canonical URL is resolved
  // against (including the ones set per-page via `generateMetadata`).
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Cairo | Accesorios",
    // Lets page-level metadata set only the product/page name, e.g.
    // "Cartera Luna | Cairo", via `title: { template }`.
    template: "%s | Cairo",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: "Cairo",
    title: "Cairo | Accesorios",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "es_AR",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${bagdoll.variable} ${headlineSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden overscroll-none bg-cairo-bg font-sans text-cairo-text">
        <Navbar />
        <main className="flex w-full flex-1 flex-col">{children}</main>
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
      </body>
    </html>
  );
}
