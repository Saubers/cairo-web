"use client";

import type { ReactNode } from "react";
import { useAdmin } from "@/hooks/useAdmin";

interface AdminOnlyProps {
  children: ReactNode;
  /** Optional placeholder rendered while the role check is in flight. */
  fallback?: ReactNode;
}

/**
 * Renders `children` only when the current user has the 'admin' role.
 *
 * This is a UX-only convenience that hides admin controls (e.g. "Delete
 * product") from non-admin eyes — it is NOT the security boundary. The
 * backend (Server Actions + RLS policies) and `proxy.ts`/`admin/layout.tsx`
 * already reject non-admin requests independently of what this component
 * renders.
 */
export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { isAdmin, isLoading } = useAdmin();

  if (isLoading || !isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
