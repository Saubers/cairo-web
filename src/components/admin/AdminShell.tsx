"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

interface AdminShellProps {
  children: ReactNode;
}

/**
 * Responsive backoffice shell: a fixed sidebar on desktop (lg and up), and a
 * hamburger-triggered off-canvas drawer on mobile. Owns the open/close state
 * for the mobile drawer so the sidebar links and the topbar trigger can stay
 * in sync.
 */
export function AdminShell({ children }: AdminShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    // `min-w-0` overrides this flex item's default `min-width: auto` — without it, the
    // intrinsic (min-content) width of deeply nested content (e.g. the tables' `min-w-[...]`)
    // bubbles up through every flex ancestor and prevents this row from ever shrinking
    // below that width, forcing horizontal scroll on the whole page.
    <div className="flex min-h-screen min-w-0 bg-[#f7f6f4]">
      {/* Desktop sidebar: fixed, always visible from lg breakpoint up. */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-cairo-text/10 lg:bg-cairo-bg">
        <AdminSidebar />
      </aside>

      {/* Mobile off-canvas drawer. */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              key="admin-drawer-backdrop"
              className="fixed inset-0 z-40 bg-cairo-text/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={() => setIsDrawerOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              key="admin-drawer-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Admin navigation"
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-cairo-bg shadow-2xl lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.3 }}
            >
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setIsDrawerOpen(false)}
                className="absolute right-3 top-5 text-cairo-text/60 transition-colors hover:text-cairo-primary"
              >
                <X className="h-5 w-5" />
              </button>
              <AdminSidebar onNavigate={() => setIsDrawerOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Same fix as above: this column is a flex item of the row above it, so it needs its
          own explicit `min-w-0` — the override does not cascade to nested flex containers. */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-64">
        {/* Mobile topbar: hamburger trigger, hidden on desktop. */}
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-cairo-text/10 bg-cairo-bg px-4 py-3 lg:hidden">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setIsDrawerOpen(true)}
            className="text-cairo-text transition-colors hover:text-cairo-primary"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-heading text-lg text-cairo-text">
            Cairo <span className="text-cairo-primary">Admin</span>
          </span>
        </header>

        {/* `overflow-x-hidden` + `max-w-[100vw]` are a preventive guard on the content area
            only (never the sidebar) — the absolute `max-w` is a hard ceiling that contains
            any rogue child even if a future change removes the flex `min-w-0` chain above.
            `min-w-0` lets this flex item itself shrink below its content's intrinsic width
            instead of being held open by it. */}
        <main className="min-w-0 max-w-[100vw] flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
