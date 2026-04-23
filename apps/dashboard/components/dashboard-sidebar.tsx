"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navigation } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/hooks/use-business";
import { resolvePermissions } from "@/lib/permissions";

const NAVY  = "#1C2D48";
const GREEN = "#00B67A";
const STEEL = "#6B7C93";
const CLOUD = "#F8FAFB";
const MIST  = "rgba(226,232,240,.09)";

export default function DashboardSidebar() {
  const pathname  = usePathname();
  const { business, email, isSuperAdmin, role } = useBusiness();
  const [signingOut, setSigningOut] = useState(false);

  // Role-based nav filtering. Owners / super-admins see everything; Manager /
  // Staff / POS see only what the owner granted them in Settings → Permissions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overrides = ((business?.settings as any)?.role_permissions ?? null) as Record<string, string[]> | null;
  const allowed = resolvePermissions(role, overrides, isSuperAdmin);
  const visibleNav = navigation.filter(n => allowed.includes(n.href));

  // Use real business data, fall back to placeholder while loading
  const bizName  = business?.name     ?? "Your Business";
  const bizType  = business?.type     ?? "";
  const bizLogo  = "🏪"; // Will be replaced with actual logo_url when set in Settings

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    // Fire-and-forget client signOut so the in-memory Supabase client forgets
    // its token immediately — the server endpoint is what actually clears the
    // cookies that the proxy reads, and does a 303 redirect to /login.
    try { await supabase.auth.signOut(); } catch { /* ignore — server handles it */ }
    // Use a real navigation (not fetch) so the browser follows the 303 redirect
    // and the cleared Set-Cookie headers actually land.
    window.location.href = "/auth/logout";
  };

  return (
    <aside style={{
      width: 240,
      background: "rgba(15,25,42,.92)",
      backdropFilter: "blur(28px)",
      borderRight: `1px solid ${MIST}`,
      position: "fixed", top: 0, left: 0, bottom: 0,
      display: "flex", flexDirection: "column",
      zIndex: 40, overflowY: "auto",
    }}>

      {/* ── Logo ── */}
      <div style={{ padding: "22px 20px 16px", borderBottom: `1px solid ${MIST}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11,
            background: GREEN,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-outfit)", fontWeight: 800, fontSize: 16,
            color: NAVY, flexShrink: 0,
            boxShadow: "0 3px 14px rgba(0,182,122,.35)",
          }}>ZB</div>
          <div>
            <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 16, lineHeight: 1.1 }}>
              <span style={{ color: CLOUD }}>Zentra</span>
              <span style={{ color: GREEN }}>Bite</span>
            </div>
            <div style={{ fontSize: 11, color: STEEL, marginTop: 2, fontFamily: "var(--font-inter)" }}>
              Merchant CRM
            </div>
          </div>
        </div>
      </div>

      {/* ── Business info ── */}
      <div style={{ padding: "14px 20px 12px", borderBottom: `1px solid ${MIST}` }}>
        <div style={{ fontSize: 22, marginBottom: 5 }}>{bizLogo}</div>
        <div style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: 14, color: CLOUD }}>
          {bizName}
        </div>
        <div style={{ fontSize: 12, color: STEEL, marginTop: 2, fontFamily: "var(--font-inter)" }}>
          {bizType || "Configure in Settings"}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: "10px 8px" }}>
        {visibleNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10, marginBottom: 2,
                fontFamily: "var(--font-inter)", fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? GREEN : STEEL,
                background: isActive ? "rgba(0,182,122,.11)" : "transparent",
                borderLeft: `2px solid ${isActive ? GREEN : "transparent"}`,
                textDecoration: "none", transition: "all .15s",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{item.emoji}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Super admin link ── */}
      {isSuperAdmin && (
        <div style={{ padding: "0 8px 4px" }}>
          <Link href="/admin" style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:10, background:"rgba(255,71,87,.08)", border:"1px solid rgba(255,71,87,.15)", textDecoration:"none", color:"#FF4757", fontSize:12, fontFamily:"var(--font-inter)", fontWeight:600 }}>
            <span>🔐</span> Super Admin
          </Link>
        </div>
      )}

      {/* ── Bottom: business + logout ── */}
      <div style={{ padding: "12px 14px", borderTop: `1px solid ${MIST}` }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 13px", borderRadius: 10,
          background: "rgba(28,45,72,.6)",
          border: `1px solid ${MIST}`,
          marginBottom: 6,
        }}>
          <span style={{ fontSize: 16 }}>{bizLogo}</span>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontFamily: "var(--font-inter)", fontSize: 12, color: CLOUD, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {bizName}
            </div>
            {email && <div style={{ fontSize: 10, color: STEEL, marginTop: 1 }}>{email}</div>}
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={signingOut}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            width: "100%", padding: "9px 13px", borderRadius: 10,
            background: "transparent", border: "none",
            fontFamily: "var(--font-inter)", fontSize: 13, color: STEEL,
            cursor: signingOut ? "wait" : "pointer",
            opacity: signingOut ? 0.6 : 1,
            transition: "color .15s", textAlign: "left",
          }}
          onMouseEnter={e => { if (!signingOut) e.currentTarget.style.color = "#FF4757"; }}
          onMouseLeave={e => { if (!signingOut) e.currentTarget.style.color = STEEL; }}
        >
          <span style={{ fontSize: 15 }}>→</span> {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
