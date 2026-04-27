// ============================================================
// app/page.tsx — ROOT ROUTER
//
// This is a client component (not a server redirect) because Supabase
// password-recovery emails sometimes redirect to "/" with the access token
// in the URL *hash fragment* (e.g. /#access_token=…&type=recovery). The
// server never sees hash fragments, and some mobile browsers strip them
// through a 303 redirect — so we have to handle this in the browser.
//
// Behaviour:
//   • Hash contains type=recovery → forward to /reset-password (keep hash)
//   • Hash contains error (e.g. otp_expired) → forward to /reset-password
//     so the page can show the actual error instead of a login form.
//   • Has session                 → /dashboard
//   • No session                  → /login
// ============================================================
"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default function RootPage() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash || "";

    // Password-recovery rescue — Supabase sometimes drops these here.
    if (hash.includes("type=recovery") || hash.includes("error_code=")) {
      window.location.replace(`/reset-password${hash}`);
      return;
    }

    // Otherwise, route on session presence.
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        window.location.replace(session ? "/dashboard" : "/login");
      } catch {
        window.location.replace("/login");
      }
    })();
  }, []);

  // Brief splash while the client-side router decides where to send the user.
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F1F2D",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-inter)",
      color: "#6B7C93",
      fontSize: 13,
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: "#00B67A",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 20,
          color: "#1C2D48",
          margin: "0 auto 16px",
          boxShadow: "0 4px 20px rgba(0,182,122,.35)",
        }}>ZB</div>
        Loading…
      </div>
    </div>
  );
}
