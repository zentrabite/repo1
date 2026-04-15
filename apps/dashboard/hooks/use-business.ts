"use client";

// ─── useBusiness hook ─────────────────────────────────────────────────────────
// Returns the current user's session, user record, and business.
// Call this at the top of any page that needs to know who's logged in.

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Business } from "@/lib/database.types";

interface BusinessState {
  loading:    boolean;
  businessId: string | null;
  business:   Business | null;
  userId:     string | null;
  email:      string | null;
  isSuperAdmin: boolean;
}

export function useBusiness(): BusinessState {
  const [state, setState] = useState<BusinessState>({
    loading:      true,
    businessId:   null,
    business:     null,
    userId:       null,
    email:        null,
    isSuperAdmin: false,
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

      const businessId   = userRow?.business_id ?? null;
      const isSuperAdmin = userRow?.is_super_admin ?? false;

      // 3. Get business details
      let business: Business | null = null;
      if (businessId) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", businessId)
          .single();
        business = biz;
      }

      setState({ loading: false, businessId, business, userId, email, isSuperAdmin });
    }

    load();

    // Re-run when auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, []);

  return state;
}
