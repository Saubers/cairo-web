"use client";

import { useRouter } from "next/navigation";
import type { KeyboardEvent, ReactNode } from "react";

interface AdminOrderRowProps {
  href: string;
  children: ReactNode;
}

/**
 * Makes an entire admin orders table row clickable, navigating to the order
 * detail page. Rendered as a real `<tr>` (not a `<Link>` wrapping the row,
 * which would be invalid HTML inside a `<table>`), with keyboard support so
 * the row is reachable without a mouse.
 */
export function AdminOrderRow({ href, children }: AdminOrderRowProps) {
  const router = useRouter();

  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>): void {
    if (event.key === "Enter") {
      router.push(href);
    }
  }

  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={handleKeyDown}
      className="cursor-pointer border-b border-cairo-text/5 transition-colors duration-200 last:border-0 hover:bg-cairo-accent-blue/10"
    >
      {children}
    </tr>
  );
}
