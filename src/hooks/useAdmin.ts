"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface UseAdminResult {
  isAdmin: boolean;
  isLoading: boolean;
}

/**
 * Client-side permission hook for conditionally rendering admin-only UI
 * (e.g. hiding "Delete product" from non-admin eyes).
 *
 * This is a UX convenience ONLY. It is NOT a security boundary — the real
 * access control already happens server-side via `proxy.ts`, the
 * `/admin` layout's authoritative role check, and RLS policies. Removing or
 * bypassing this hook would at most reveal a button that does nothing, since
 * the underlying Server Actions and database policies independently reject
 * non-admin requests.
 */
export function useAdmin(): UseAdminResult {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    async function checkRole(): Promise<void> {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) {
          setIsAdmin(false);
          setIsLoading(false);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle<{ role: string }>();

      if (isMounted) {
        setIsAdmin(profile?.role === "admin");
        setIsLoading(false);
      }
    }

    checkRole();

    // Re-check whenever the session changes (login/logout in this tab or
    // another one sharing the same browser storage).
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      setIsLoading(true);
      checkRole();
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, isLoading };
}
