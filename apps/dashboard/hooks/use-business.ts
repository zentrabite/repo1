"use client";

// ─── useBusiness hook ─────────────────────────────────────────────────────────
// Returns the current user's session, user record, and business.
// Call this at the top of any page that needs to know who's logged in.
//
// If the signed-in user is a super admin AND the `zb_impersonate` cookie is set,
// the hook returns the *impersonated* business instead of their own, while
// keeping isSuperAdmin=true and exposing impersonatingBusinessId.

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Business } from "@/lib/database.types";

interface BusinessState {
  loading:      boolean;
  businessId:   string | null;
  business:     Business | null;
  userId:       string | null;
  email:        string | null;
  isSuperAdmin: boolean;
  impersonatingBusinessId: string | null;
  // Role of the current user for the current business. "Owner" by default —
  // drives role-based nav hiding in the sidebar.
  role:         string | null;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find(c => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function useBusiness(): BusinessState {
  const [state, setState] = useState<BusinessState>({
    loading:      true,
    businessId:   null,
    business:     null,
    userId:       null,
    email:        null,
    isSuperAdmin: false,
    impersonatingBusinessId: null,
    role:         null,
  });

  useEffect(() => {
    async function load() {
      // 1. Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState(s => ({ ...s, loading: false }));
        return;
      }

      const userId = session.user.id;
      const email  = session.user.email ?? null;

      // 2. Get user record (has business_id + is_super_admin)
      const { data: userRow } = await supabase
        .from("users")
        .select("business_id, is_super_admin")
        .eq("id", userId)
        .single();

      const isSuperAdmin = userRow?.is_super_admin ?? false;
      let businessId: string | null = userRow?.business_id ?? null;

      // 3. If super admin and impersonation cookie is set, swap the business
      let impersonatingBusinessId: string | null = null;
      if (isSuperAdmin) {
        const imp = readCookie("zb_impersonate");
        if (imp) {
          impersonatingBusinessId = imp;
          businessId = imp;
        }
      }

      // 4. Get business details
      let business: Business | null = null;
      if (businessId) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", businessId)
          .single();
        business = biz;
      }

      // 5. Resolve role. Users.business_id owners are always "Owner"; everyone
      // else's role comes from business_members keyed on their email.
      let role: string | null = null;
      const ownsBusiness = !impersonatingBusinessId && userRow?.business_id === businessId;
      if (ownsBusiness || isSuperAdmin) {
        role = "Owner";
      } else if (businessId && email) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: memberRow } = await (supabase.from("business_members") as any)
          .select("role")
          .eq("business_id", businessId)
          .eq("email", email)
          .maybeSingle();
        role = memberRow?.role ?? "Staff";
      }

      setState({
        loading: false,
        businessId,
        business,
        userId,
        email,
        isSuperAdmin,
        impersonatingBusinessId,
        role,
      });
    }

    load();

    // Re-run when auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, []);

  return state;
}

export async function stopImpersonating() {
  try {
    await fetch("/api/admin/impersonate", { method: "DELETE" });
  } catch {
    // Even if the call fails, clear the cookie locally and reload.
    if (typeof document !== "undefined") {
      document.cookie = "zb_impersonate=; Path=/; Max-Age=0";
    }
  }
  if (typeof window !== "undefined") {
    window.location.href = "/admin";
  }
}
