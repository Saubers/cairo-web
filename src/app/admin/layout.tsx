import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

interface AdminLayoutProps {
  children: ReactNode;
}

// Applies to every /admin/* page via Next.js route-segment-config
// inheritance: the admin panel reads live, per-request auth/role state and
// must never be served from a cached render. Explicit here even though the
// `auth.getUser()` call below already opts this layout out of static
// rendering implicitly.
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// ROLE VALIDATION (see docs/context/admin-flow.md for the full rationale).
//
// This layout is the second of three defense layers protecting /admin:
//   1. src/proxy.ts  — cheap, "optimistic" session + role pre-check that
//      redirects unauthenticated/non-admin requests before they even reach
//      this layout.
//   2. THIS layout    — the authoritative, server-side role check. It runs
//      on every request to /admin/* and redirects away any non-admin user
//      BEFORE rendering the sidebar or any admin content.
//   3. RLS policies    — `is_admin()` on products/categories/orders, the
//      final, non-bypassable enforcement at the data layer.
//
// The sidebar/drawer UI itself lives in `AdminShell` (a Client Component),
// since it needs interactive state for the mobile off-canvas menu — but the
// access check that gates everything it renders stays here, server-side.
// ---------------------------------------------------------------------------

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string }>();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return <AdminShell>{children}</AdminShell>;
}
