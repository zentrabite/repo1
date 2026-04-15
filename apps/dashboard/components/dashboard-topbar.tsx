"use client";

import { usePathname } from "next/navigation";
import { navigation } from "@/lib/navigation";

const NAVY  = "#1C2D48";
const GREEN = "#00B67A";
const STEEL = "#6B7C93";
const CLOUD = "#F8FAFB";
const MIST  = "rgba(226,232,240,.09)";

export default function DashboardTopbar() {
  const pathname = usePathname();
  const currentPage = navigation.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 30,
      height: 66,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: `1px solid ${MIST}`,
      background: "rgba(12,22,36,.93)",
      backdropFilter: "blur(28px)",
      padding: "0 32px",
    }}>

      {/* Page title — Outfit heading (H2 per brand spec) */}
      <div>
        <h1 style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: 700,
          fontSize: 20,
          color: CLOUD,
          lineHeight: 1,
        }}>
          {currentPage?.label ?? "Dashboard"}
        </h1>
        {/* Caption — Inter per brand spec */}
        <p style={{
          display: "flex", alignItems: "center", gap: 7,
          fontFamily: "var(--font-inter)",
          fontSize: 12, color: STEEL, marginTop: 4,
        }}>
          {currentPage?.description ?? "Overview"}
          <span className="ld" />
        </p>
      </div>

      {/* Search + user avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "9px 16px", borderRadius: 8,   // 8px — input radius per brand spec
          border: `1px solid ${MIST}`,
          background: "rgba(28,45,72,.5)",
        }}>
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={STEEL} strokeWidth={1.5}>
            <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search..."
            style={{
              width: 160, background: "transparent", border: "none",
              outline: "none", fontSize: 14, color: CLOUD,
              fontFamily: "var(--font-inter)", padding: 0,
            }}
          />
        </div>

        {/* User avatar: ZB = Navy on Green, brand spec */}
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: GREEN,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontFamily: "var(--font-outfit)", fontWeight: 800,
          color: NAVY,   // ← Navy on Green
          cursor: "pointer",
          boxShadow: "0 2px 12px rgba(0,182,122,.3)",
        }}>
          ZB
        </div>
      </div>
    </header>
  );
}
