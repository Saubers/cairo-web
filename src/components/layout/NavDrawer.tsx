"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface NavLinkItem {
  href: string;
  label: string;
}

interface NavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  links: NavLinkItem[];
}

/**
 * Slide-in navigation drawer opened from the hamburger icon in the Navbar.
 * Animates in/out from the left edge of the screen using framer-motion.
 */
export function NavDrawer({ isOpen, onClose, links }: NavDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop: click to dismiss */}
          <motion.div
            key="nav-drawer-backdrop"
            className="fixed inset-0 z-[60] bg-cairo-text/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sliding panel */}
          <motion.div
            key="nav-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            className="fixed left-0 top-0 z-[70] flex h-full w-full max-w-sm flex-col bg-cairo-bg shadow-2xl"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.4 }}
          >
            <div className="flex items-center justify-between px-6 py-6">
              <span className="font-heading text-xl text-cairo-text">Cairo</span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={onClose}
                className="text-cairo-text transition-colors hover:text-cairo-primary"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 px-6 py-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className="rounded-md px-2 py-3 text-lg font-medium text-cairo-text transition-colors hover:text-cairo-primary"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
